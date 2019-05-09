import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Word } from './models/word.model';
import { WordDto } from './dto/word.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { BaseService } from '../shared/base.service';
import { MapperService } from '../shared/mapper/mapper.service';
import { CreateWordDto } from './dto/create-word.dto';
import { User } from '../user/models/user.model';

@Injectable()
export class WordService extends BaseService<Word>  {
  constructor(
    @InjectModel(Word.modelName) private readonly wordModel: ModelType<Word>,
    private readonly mapperService: MapperService,
  ) {
    super();
    this.model = wordModel;
    this.mapper = mapperService.mapper;
  }

  async createWord(word: CreateWordDto, owner: User): Promise<Word> {
    const newWord = Word.createModel();

    console.log(owner);

    newWord.name = word.name;
    newWord.definition = word.definition;
    newWord.tags = word.tags;
    newWord.userId = BaseService.toObjectId(owner.id);
    newWord.votes = [];

    try {
      const result = await this.create(newWord);
      return result.toJSON() as Word;
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async getAggregatedWords(skip: number, take: number, user?: User): Promise<{
    words: WordDto[],
    count: number,
  }> {
    const getWords = () => this.wordModel.aggregate()
      .limit(take)
      .skip(skip)
      .sort({
        createdAt: 'ascending',
      })
      .project({
        _id: true,
        word: true,
        definition: true,
        userId: true,
        tags: true,
        votes: false,
        createdAt: true,
        updatedAt: true,
        score: {
          $cond : ['$votes.value', 1, 0],
        },
        userUpVoted: user.id ? {
          $in: [user.id, '$votes.userId'],
        } : {
          $toBool: false,
        },
        userDownVoted: user.id ? {
          $ne: '$userUpVoted',
        } : {
          $toBool: false,
        },
      })
      .exec();

    const [
      words,
      count,
    ] = await Promise.all([
      getWords(),
      this.wordModel.count({}).exec(),
    ]);

    return {
      words: await this.map<WordDto[]>(words),
      count,
    };
  }
}
