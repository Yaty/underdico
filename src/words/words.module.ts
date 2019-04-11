import { Module } from '@nestjs/common';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { DatabaseModule } from '../database/database.module';
import { wordsProviders } from './words.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [WordsController],
  providers: [WordsService, ...wordsProviders],
})
export class WordsModule {}
