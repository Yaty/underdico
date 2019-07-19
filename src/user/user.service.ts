import { ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
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
import { RoomService } from '../room/room.service';
import { ConfigurationService } from '../shared/configuration/configuration.service';
import { UserRole } from './models/user-role.enum';
import { Configuration } from '../shared/configuration/configuration.enum';
import { Sort } from '../shared/decorators/sort.decorator';

@Injectable()
export class UserService extends BaseService<User, UserDto> implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.modelName) private readonly userModel: ModelType<User>,
    mapper: UserMapper,
    private readonly configurationService: ConfigurationService,
    private readonly authService: AuthService,
    private readonly wordService: WordService,
    private readonly roomService: RoomService,
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

  async onApplicationBootstrap(): Promise<void> {
    try {
      const adminDoNotExists = (await this.userModel.countDocuments({
        username: 'admin',
      })) === 0;

      if (adminDoNotExists) {
        await this.userModel.create({
          username: 'admin',
          role: UserRole.Admin,
          password: await this.hashPassword(this.configurationService.get(Configuration.ADMIN_PASSWORD)),
          email: this.configurationService.get(Configuration.ADMIN_EMAIL),
        });
      }

      this.logger.log('User service initialized');
    } catch (err) {
      this.logger.error('Error while initializing user service', err.toString());
    }
  }

  async register(dto: RegisterDto): Promise<User> {
    const { username, email, password } = dto;

    const newUser = User.createModel();
    newUser.username = username.trim().toLowerCase();
    newUser.password = await this.hashPassword(password);
    newUser.email = email.trim();
    newUser.locale = dto.locale;

    const user = await this.userModel.create(newUser);
    return this.findUserById(user.id);
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

  async getUsers(skip: number, take: number, where = {}, sort?: Sort): Promise<{
    users: User[];
    count: number;
  }> {
    const pipeline: object[] = [{
      $match: where,
    }];

    if (sort) {
      pipeline.push({
        $sort: {
          [sort.field]: sort.ordering === 'asc' ? 1 : -1,
        },
      });
    } else {
      pipeline.push({
        $sort: {
          createdAt: -1,
        },
      });
    }

    if (typeof skip === 'number' && skip > 0) {
      pipeline.push({
        $skip: skip,
      });
    }

    if (typeof take === 'number' && take > 0 && take !== Infinity) {
      pipeline.push({
        $limit: take,
      });
    }

    const [users, count] = await Promise.all([
      this.userModel.aggregate(pipeline).exec(),
      this.userModel.countDocuments(where).exec(),
    ]);

    await Promise.all(users.map(async (user) => {
      const [karma, score] = await Promise.all([
        this.wordService.getUserWordsTotalScore(user._id.toString()),
        this.roomService.getUserScore(user._id.toString()),
      ]);

      user.karma = karma;
      user.score = score;
    }));

    return {
      users,
      count,
    };
  }

  async findUserById(userId: string): Promise<User> {
    if (UserService.isInvalidObjectId(userId)) {
      throw new NotFoundException('User not found');
    }

    const {
      users,
    } = await this.getUsers(0, 1, {
      _id: UserService.toObjectId(userId),
    });

    if (!users[0]) {
      throw new NotFoundException('User not found');
    }

    return users[0];
  }
}
