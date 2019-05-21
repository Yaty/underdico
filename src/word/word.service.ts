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
  private readonly votesLookupOption = {
    from: 'votes',
    localField: '_id',
    foreignField: 'wordId',
    as: 'votes',
  };

  private readonly usersLookupOption = {
    from: 'users',
    localField: 'userId',
    foreignField: '_id',
    as: 'user',
  };

  constructor(
    @InjectModel(Word.modelName) private readonly wordModel: ModelType<Word>,
    public readonly mapper: WordMapper,
    private readonly voteService: VoteService,
  ) {
    super(wordModel, mapper);
  }

  async createWord(word: CreateWordDto, owner: User): Promise<Word> {
    const newWord = Word.createModel();

    newWord.name = word.name;
    newWord.definition = word.definition;
    newWord.tags = word.tags;
    newWord.userId = owner._id;

    const result = await this.create(newWord);

    return {
      user: owner,
      ...result.toJSON(),
    };
  }

  async getAggregatedWords(skip: number, take: number): Promise<{
    words: Word[],
    count: number,
  }> {
    const [
      words,
      count,
    ] = await Promise.all([
      this.wordModel
        .aggregate()
        .sort({
          createdAt: 'descending',
        })
        .skip(skip)
        .limit(take)
        .lookup(this.votesLookupOption)
        .lookup(this.usersLookupOption)
        .unwind('user')
        .exec(),
      this.count(),
    ]);

    return {
      words,
      count,
    };
  }

  async findWordById(id: string): Promise<Word> {
    const words = await this.wordModel
      .aggregate()
      .match({
        _id: BaseService.toObjectId(id),
      })
      .lookup(this.votesLookupOption)
      .lookup(this.usersLookupOption)
      .unwind('user')
      .exec();

    if (words.length === 0) {
      throw new NotFoundException('Word not found');
    }

    return words[0];
  }

  async getRandomWordId(): Promise<string> {
    const count = await this.count();
    const random = Math.floor(Math.random() * count);
    const word = await this.wordModel.findOne().skip(random).lean().exec();
    return word._id;
  }

  getDailyWordId(): Promise<string> {
    return this.voteService.getTodayBestWordIdByVote();
  }

  async createVote(wordId: string, voteValue: boolean, user: User): Promise<Vote> {
    const wordDoNotExists = await this.doNotExists(wordId);

    if (wordDoNotExists) {
      throw new NotFoundException('Word not found');
    }

    const vote = await this.voteService.createVote(wordId, voteValue, user);

    await this.wordModel.updateOne({
      _id: wordId,
    }, {
      $push: {
        votes: vote._id,
      },
    }).exec();

    return vote;
  }

  async updateVote(wordId: string, voteId: string, voteValue: boolean, user: User): Promise<Vote> {
    const wordDoNotExists = await this.doNotExists(wordId);

    if (wordDoNotExists) {
      throw new NotFoundException('Word not found');
    }

    return this.voteService.updateVote(voteId, voteValue, user);
  }

  async getUserWordsTotalScore(userId: string): Promise<number> {
    const res = await this.wordModel
      .aggregate()
      .match({
        userId: BaseService.toObjectId(userId),
      })
      .lookup(this.votesLookupOption)
      .unwind('$votes')
      .group({
        _id: null,
        total: {
          $sum: {
            $cond: [
              '$votes.value',
              1,
              -1,
            ],
          },
        },
      })
      .exec();

    if (res.length === 0) {
      return 0;
    }

    return res[0].total;
  }
}
