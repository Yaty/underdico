import { Module } from '@nestjs/common';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Word } from './models/word.model';
import { VoteModule } from '../vote/vote.module';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Word.modelName,
      schema: Word.model.schema,
    }]),
    VoteModule,
  ],
  controllers: [WordController],
  providers: [WordService],
  exports: [WordService],
})
export class WordModule {}
