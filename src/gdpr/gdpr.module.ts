import { Module } from '@nestjs/common';
import { WordModule } from '../word/word.module';
import { RoomModule } from '../room/room.module';
import { VoteModule } from '../vote/vote.module';
import { UserModule } from '../user/user.module';
import { GDPRController } from './gdpr.controller';

@Module({
  imports: [
    UserModule,
    VoteModule,
    WordModule,
    RoomModule,
  ],
  controllers: [GDPRController],
})
export class GDPRModule {}
