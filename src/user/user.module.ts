import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from './models/user.model';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserMapper } from '../shared/mappers/user.mapper';
import { WordModule } from '../word/word.module';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: User.modelName,
      schema: User.model.schema,
    }]),
    WordModule,
  ],
  providers: [UserService, UserMapper],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
