import { Module } from '@nestjs/common';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Word } from './models/word.model';
import { WordMapper } from '../shared/mappers/word.mapper';
import { VoteModule } from '../vote/vote.module';
import { VoteMapper } from '../shared/mappers/vote.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Word.modelName,
      schema: Word.model.schema,
    }]),
    VoteModule,
  ],
  controllers: [WordController],
  providers: [WordService, WordMapper, VoteMapper],
  exports: [WordService],
})
export class WordModule {}
