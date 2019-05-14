import { Module } from '@nestjs/common';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Word } from './models/word.model';
import { WordMapper } from './mappers/word.mapper';
import { VoteMapper } from './mappers/vote.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Word.modelName,
      schema: Word.model.schema,
    }]),
  ],
  controllers: [WordController],
  providers: [WordService, WordMapper, VoteMapper],
})
export class WordModule {}
