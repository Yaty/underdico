import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from './models/user.model';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { WordModule } from '../word/word.module';
import { RoomModule } from '../room/room.module';
import { VoteModule } from '../vote/vote.module';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: User.modelName,
      schema: User.model.schema,
    }]),
    VoteModule,
    WordModule,
    RoomModule,
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
