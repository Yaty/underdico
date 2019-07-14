import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { User } from '../../user/models/user.model';
import { Configuration } from '../configuration/configuration.enum';
import { ConfigurationService } from '../configuration/configuration.service';
import { ExtractJWTFromWs } from '../utilities/extract-jwt-ws.helper';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigurationService,
  ) {
    this.jwtSecret = configService.get(Configuration.JWT_SECRET);
  }

  async canActivate(context: ExecutionContext) {
    const client = context.switchToWs().getClient();
    const authToken = ExtractJWTFromWs(client);
    const jwtPayload: JwtPayload = jwt.verify(authToken, this.jwtSecret) as JwtPayload;
    const user: User = await this.authService.validateUser(jwtPayload);
    context.switchToWs().getData().user = user;
    return Boolean(user);
  }
}
