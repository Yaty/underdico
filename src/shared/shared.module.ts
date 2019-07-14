import { Global, Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { ConfigurationService } from './configuration/configuration.service';
import { StorageService } from './storage/storage.service';
import { RoomMapper } from './mappers/room.mapper';
import { WordMapper } from './mappers/word.mapper';
import { VoteMapper } from './mappers/vote.mapper';
import { UserMapper } from './mappers/user.mapper';

@Global()
@Module({
  providers: [ConfigurationService, AuthService, JwtStrategy, StorageService, RoomMapper, WordMapper, VoteMapper, UserMapper, RoomMapper],
  exports: [ConfigurationService, AuthService, StorageService, RoomMapper, WordMapper, VoteMapper, UserMapper, RoomMapper],
  imports: [UserModule],
})
export class SharedModule {}
