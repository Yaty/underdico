import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { AuthService } from '../shared/auth/auth.service';
import { JwtPayload } from '../shared/auth/jwt-payload.interface';
import { BaseService } from '../shared/base.service';
import { User } from './models/user.model';
import { TokenResponseDto } from './dto/token-response.dto';
import { CredentialsDto } from './dto/credentials.dto';
import { RegisterDto } from './dto/register.dto';
import { randomBytes, scrypt } from 'crypto';
import { UserMapper } from '../shared/mappers/user.mapper';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { WordService } from '../word/word.service';

@Injectable()
export class UserService extends BaseService<User, UserDto> {
  constructor(
    @InjectModel(User.modelName) private readonly userModel: ModelType<User>,
    mapper: UserMapper,
    readonly authService: AuthService,
    readonly wordService: WordService,
  ) {
    super(userModel, mapper);
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

  async register(dto: RegisterDto): Promise<User> {
    const { username, email, password } = dto;

    const newUser = User.createModel();
    newUser.username = username.trim().toLowerCase();
    newUser.password = await this.hashPassword(password);
    newUser.email = email.trim();
    newUser.locale = dto.locale;

    const user = await this.userModel.create(newUser);
    return user.toJSON();
  }

  async login(dto: CredentialsDto): Promise<TokenResponseDto> {
    const { username, password } = dto;

    const user = await this.userModel.findOne({
      username,
    }).lean().exec();

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

  async updateUser(userId: string, dto: UpdateUserDto, authenticatedUser: User): Promise<User> {
    const user = await this.findUserById(userId);

    if (BaseService.objectIdToString(user._id) !== BaseService.objectIdToString(authenticatedUser._id)) {
      throw new ForbiddenException('You do not own this user');
    }

    if (dto.password) {
      dto.password = await this.hashPassword(dto.password);
    }

    await this.userModel.updateOne({
      _id: userId,
    }, dto).exec();

    return this.findUserById(userId);
  }

  async findUserById(userId: string): Promise<User> {
    if (BaseService.isInvalidObjectId(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel
      .findById(userId)
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.karma = await this.wordService.getUserWordsTotalScore(userId);
    return user;
  }
}
