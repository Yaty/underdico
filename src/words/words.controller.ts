import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WordsService } from './words.service';
import { CreateWordDto } from './dto/create-word.dto';
import { Word } from './interfaces/word.interface';
import { AggregatedWord } from './interfaces/aggregated-word.interface';
import { ApiUseTags } from '@nestjs/swagger';

@Controller('words')
@ApiUseTags('users')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  create(@Body() createWordDto: CreateWordDto): Promise<Word> {
    return this.wordsService.create(createWordDto);
  }

  @Get()
  findAll(@Query() query): Promise<AggregatedWord[]> {
    const take = query.take || 25;
    const skip = query.skip || 0;

    return this.wordsService.findAll(take, skip);
  }
}
