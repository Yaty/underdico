import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WordsService } from './words.service';
import { CreateWordDto } from './dto/create-word.dto';
import { Word } from './interfaces/word.interface';

@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  create(@Body() createWordDto: CreateWordDto): Promise<Word> {
    return this.wordsService.create(createWordDto);
  }

  @Get()
  findAll(@Query() query): Promise<Word[]> {
    const take = query.take || 25;
    const skip = query.skip || 0;

    return this.wordsService.findAll(take, skip);
  }
}
