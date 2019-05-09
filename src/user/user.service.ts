import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { AuthService } from '../shared/auth/auth.service';
import { JwtPayload } from '../shared/auth/jwt-payload.interface';
import { BaseService } from '../shared/base.service';
import { MapperService } from '../shared/mapper/mapper.service';
import { User } from './models/user.model';
import { TokenResponseDto } from './dto/token-response.dto';
import { TokenDto } from './dto/token.dto';
import { RegisterDto } from './dto/register.dto';
import { randomBytes, scrypt } from 'crypto';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectModel(User.modelName) private readonly userModel: ModelType<User>,
    private readonly mapperService: MapperService,
    @Inject(forwardRef(() => AuthService)) readonly authService: AuthService,
  ) {
    super();
    this.model = userModel;
    this.mapper = mapperService.mapper;
  }

  private readonly SCRYPT_MEMBERS_SEPARATOR = '$';
  private readonly SCRYPT_MEMBERS_ENCODING = 'hex';

  private hashPassword(password): Promise<string> {
    const scryptLen = 64;
    const salt = randomBytes(scryptLen);

    return new Promise((resolve, reject) => {
      scrypt(password, salt, scryptLen, (err, derivedKey) => {
        if (err) {
          return reject(err);
        }

        resolve(
          scryptLen +
          this.SCRYPT_MEMBERS_SEPARATOR +
          salt.toString(this.SCRYPT_MEMBERS_ENCODING) +
          this.SCRYPT_MEMBERS_SEPARATOR +
          derivedKey.toString(this.SCRYPT_MEMBERS_ENCODING),
        );
      });
    });
  }

  private checkPassword(saltedPasswordHash, candidatePassword): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [scryptLen, salt, expectedDerivedKey] = saltedPasswordHash.split(this.SCRYPT_MEMBERS_SEPARATOR);

      scrypt(candidatePassword, Buffer.from(salt, this.SCRYPT_MEMBERS_ENCODING), Number(scryptLen), (err, derivedKey) => {
        if (err) {
          return reject(err);
        }

        resolve(expectedDerivedKey === derivedKey.toString(this.SCRYPT_MEMBERS_ENCODING));
      });
    });
  }

  async register(dto: RegisterDto) {
    const { username, email, password } = dto;

    const newUser = User.createModel();
    newUser.username = username.trim().toLowerCase();
    newUser.password = await this.hashPassword(password);
    newUser.email = email.trim();

    try {
      const result = await this.create(newUser);
      return result.toJSON() as User;
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async login(dto: TokenDto): Promise<TokenResponseDto> {
    const { username, password } = dto;

    const user = await this.findOne({
      username,
    });

    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.BAD_REQUEST);
    }

    const isMatch = await this.checkPassword(user.password, password);

    if (!isMatch) {
      throw new HttpException('Invalid credentials', HttpStatus.BAD_REQUEST);
    }

    const payload: JwtPayload = {
      username: user.username,
      email: user.email,
      role: user.role,
      id: BaseService.objectIdToString(user._id),
    };

    const {
      token,
      createdAt,
      expiresIn,
    } = await this.authService.signPayload(payload);

    return {
      token,
      expiresIn,
      createdAt,
      userId: user._id,
    };
  }
}
