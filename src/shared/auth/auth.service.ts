import * as uuid from 'uuid/v4';
import * as jwt from 'jsonwebtoken';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { JwtPayload } from './jwt-payload.interface';
import { User } from '../../user/models/user.model';
import { SignOptions } from 'jsonwebtoken';
import { ConfigurationService } from '../configuration/configuration.service';
import { Configuration } from '../configuration/configuration.enum';
import { JwtDto } from './jwt.dto';

@Injectable()
export class AuthService {
  private readonly jwtOptions: SignOptions;
  private readonly jwtSecret: string;

  constructor(
    @Inject(forwardRef(() => UserService)) readonly userService: UserService,
    private readonly configurationService: ConfigurationService,
  ) {
    this.jwtOptions = {
      algorithm: configurationService.get(Configuration.JWT_ALGORITHM),
      expiresIn: configurationService.get(Configuration.JWT_EXPIRATION),
      issuer: configurationService.get(Configuration.JWT_ISSUER),
    };

    this.jwtSecret = configurationService.get(Configuration.JWT_SECRET);
  }

  async signPayload(payload: JwtPayload): Promise<JwtDto> {
    const token = await jwt.sign(payload, this.jwtSecret, {
      ...this.jwtOptions,
      subject: payload.id,
      jwtid: uuid(),
    });

    return {
      token,
      createdAt: new Date(),
      expiresIn: Number(this.jwtOptions.expiresIn),
    };
  }

  async validateUser(validatePayload: JwtPayload): Promise<User> {
    return this.userService.findOne({
      _id: validatePayload.id,
    });
  }
}
