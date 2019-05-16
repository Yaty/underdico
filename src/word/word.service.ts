import { Injectable, NotFoundException } from '@nestjs/common';
import { Word } from './models/word.model';
import { WordDto } from './dto/word.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { BaseService } from '../shared/base.service';
import { CreateWordDto } from './dto/create-word.dto';
import { User } from '../user/models/user.model';
import { WordMapper } from '../shared/mappers/word.mapper';
import { Vote } from '../vote/models/vote.model';
import { VoteService } from '../vote/vote.service';

@Injectable()
export class WordService extends BaseService<Word, WordDto> {
  constructor(
    @InjectModel(Word.modelName) private readonly wordModel: ModelType<Word>,
    public readonly mapper: WordMapper,
    private readonly voteService: VoteService,
  ) {
    super(wordModel, mapper);
  }

  private async wordDoNotExists(wordId: string): Promise<boolean> {
    return (await this.count({
      _id: wordId,
    })) === 0;
  }

  async createWord(word: CreateWordDto, owner: User): Promise<Word> {
    const newWord = Word.createModel();

    newWord.name = word.name;
    newWord.definition = word.definition;
    newWord.tags = word.tags;
    newWord.userId = BaseService.toObjectId(owner.id);

    const result = await this.create(newWord);
    return result.toJSON();
  }

  async getAggregatedWords(skip: number, take: number): Promise<{
    words: Word[],
    count: number,
  }> {
    const [
      words,
      count,
    ] = await Promise.all([
      this.wordModel.find()
        .limit(take)
        .skip(skip)
        .populate('votes')
        .sort({
          createdAt: 'ascending',
        })
        .lean()
        .exec(),
      this.count(),
    ]);

    return {
      words,
      count,
    };
  }

  async findWordById(id: string): Promise<Word> {
    const word = await this.wordModel
      .findById(id)
      .populate('votes')
      .lean()
      .exec();

    if (!word) {
      throw new NotFoundException('Word not found');
    }

    return word;
  }

  async getRandomWordId(): Promise<string> {
    const count = await this.count();
    const random = Math.floor(Math.random() * count);
    const word = await this.wordModel.findOne().skip(random).lean().exec();
    return word._id;
  }

  async createVote(wordId: string, voteValue: boolean, user: User): Promise<Vote> {
    const wordDoNotExists = await this.wordDoNotExists(wordId);

    if (wordDoNotExists) {
      throw new NotFoundException('Word not found');
    }

    const vote = await this.voteService.createVote(wordId, voteValue, user);

    await this.wordModel.updateOne({
      _id: wordId,
    }, {
      $push: {
        votes: vote.id,
      },
    }).exec();

    return vote;
  }

  async updateVote(wordId: string, voteId: string, voteValue: boolean, user: User): Promise<Vote> {
    const wordDoNotExists = await this.wordDoNotExists(wordId);

    if (wordDoNotExists) {
      throw new NotFoundException('Word not found');
    }

    return this.voteService.updateVote(voteId, voteValue, user);
  }
}
