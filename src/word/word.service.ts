import { Injectable, NotFoundException } from '@nestjs/common';
import { Word } from './models/word.model';
import { WordDto } from './dto/word.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { BaseService } from '../shared/base.service';
import { CreateWordDto } from './dto/create-word.dto';
import { User } from '../user/models/user.model';
import { WordMapper } from './word.mapper';

@Injectable()
export class WordService extends BaseService<Word, WordDto>  {
  constructor(
    @InjectModel(Word.modelName) private readonly wordModel: ModelType<Word>,
    mapper: WordMapper,
  ) {
    super();
    this.model = wordModel;
    this.mapper = mapper;
  }

  async createWord(word: CreateWordDto, owner: User): Promise<Word> {
    const newWord = Word.createModel();

    newWord.name = word.name;
    newWord.definition = word.definition;
    newWord.tags = word.tags;
    newWord.userId = BaseService.toObjectId(owner.id);
    newWord.votes = [];

    const result = await this.create(newWord);
    return result.toJSON() as Word;
  }

  async getAggregatedWords(skip: number, take: number): Promise<{
    words: Word[],
    count: number,
  }> {
    const [
      words,
      count,
    ] = await Promise.all([
      this.wordModel.find().limit(take).skip(skip).sort({
        createdAt: 'ascending',
      }).lean().exec(),
      this.wordModel.countDocuments({}).exec(),
    ]);

    return {
      words,
      count,
    };
  }

  async findWordById(id: string): Promise<Word> {
    const word = await this.wordModel.findById(id).lean().exec();

    if (!word) {
      throw new NotFoundException('Word not found');
    }

    return word;
  }
}
