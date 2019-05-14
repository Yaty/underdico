import { Global, Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { ConfigurationService } from './configuration/configuration.service';

@Global()
@Module({
  providers: [ConfigurationService, AuthService, JwtStrategy],
  exports: [ConfigurationService, AuthService],
  imports: [UserModule],
})
export class SharedModule {}
