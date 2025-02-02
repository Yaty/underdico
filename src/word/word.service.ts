import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { UpdateWordDto } from './dto/update-word.dto';
import { Sort } from '../shared/decorators/sort.decorator';

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
    const result = await this.wordModel.create({
      ...word,
      userId: owner._id,
    });

    return this.findWordById(result._id);
  }

  async updateWord(wordId: string, dto: UpdateWordDto, user: User): Promise<Word> {
    const word = await this.findWordById(wordId);

    if (BaseService.objectIdToString(word.userId) !== BaseService.objectIdToString(user._id)) {
      throw new ForbiddenException('You do not own this word');
    }

    await this.wordModel.updateOne({
      _id: wordId,
    }, dto).exec();

    return this.findWordById(wordId);
  }

  private buildPipeline(skip?: number, take?: number, where?: {[key: string]: any}, sort?: Sort): object[] {
    const pipeline = [];
    const whereOnScore = where && 'score' in where;

    const applyWhere = () => {
      pipeline.push({
        $match: where,
      });
    };

    if (!whereOnScore && where) {
      applyWhere();
    }

    pipeline.push({
      $lookup: this.votesLookupOption,
    }, {
      $addFields: {
        scoresInBoolean: {
          $map: {
            input: '$votes',
            as: 'vote',
            in: '$$vote.value',
          },
        },
      },
    }, {
      $addFields: {
        scoresInInteger: {
          $map: {
            input: '$scoresInBoolean',
            as: 'scoreInBoolean',
            in: {
              $cond: [
                '$$scoreInBoolean',
                1,
                -1,
              ],
            },
          },
        },
      },
    }, {
      $addFields: {
        score: {
          $sum: '$scoresInInteger',
        },
      },
    });

    if (sort) {
      pipeline.push({
        $sort: {
          [sort.field]: sort.ordering === 'asc' ? 1 : -1,
        },
      });
    } else {
      pipeline.push({
        $sort: {
          createdAt: -1,
        },
      });
    }

    if (whereOnScore) {
      applyWhere();
    }

    // Paginate
    if (typeof skip === 'number' && skip > 0) {
      pipeline.push({
        $skip: skip,
      });
    }

    if (typeof take === 'number' && take > 0 && take !== Infinity) {
      pipeline.push({
        $limit: take,
      });
    }

    // Add user
    pipeline.push({
      $lookup: this.usersLookupOption,
    }, {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    });

    return pipeline;
  }

  async getAggregatedWords(skip: number, take: number, where?: object, sort?: Sort): Promise<{
    words: Word[],
    count: number,
  }> {
    const pipeline = this.buildPipeline(skip, take, where, sort);

    const [
      words,
      count,
    ] = await Promise.all([
      this.wordModel.aggregate(pipeline).exec(),
      this.count(),
    ]);

    await Promise.all(words.map(async (word) => {
      if (word.user) {
        word.user.karma = await this.getUserWordsTotalScore(word.userId);
      }
    }));

    return {
      words,
      count,
    };
  }

  async findWordById(id: string): Promise<Word> {
    if (BaseService.isInvalidObjectId(id)) {
      throw new NotFoundException('Word not found');
    }

    const words = await this.wordModel
      .aggregate()
      .match({
         _id: BaseService.toObjectId(id),
      })
      .lookup(this.votesLookupOption)
      .lookup(this.usersLookupOption)
      .unwind({
        path: '$user',
        preserveNullAndEmptyArrays: true,
      })
      .exec();

    if (words.length === 0) {
      throw new NotFoundException('Word not found');
    }

    if (words[0].user) {
      words[0].user.karma = await this.getUserWordsTotalScore(words[0].userId);
    }

    return words[0];
  }

  async getRandomWord(locale?: string): Promise<Word> {
    const where = locale ? {
      locale,
    } : {};

    const count = await this.count(where);
    const random = Math.floor(Math.random() * count);

    const word = await this.wordModel.findOne()
      .where(where)
      .skip(random)
      .lean()
      .exec();

    if (!word) {
      throw new NotFoundException();
    }

    return this.findWordById(word._id);
  }

  async getRandomWordId(locale?: string): Promise<string> {
    const word = await this.getRandomWord(locale);
    return WordService.objectIdToString(word._id);
  }

  async getDailyWordId(locale?: string): Promise<string> {
    return this.voteService.getTodayBestWordIdByVote(locale);
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

  async findUserWords(userId: string): Promise<Word[]> {
    const {words} = await this.getAggregatedWords(0, Infinity, {
      userId: WordService.toObjectId(userId),
    });

    return words;
  }

  async setHasAudio(wordId: string, hasAudio: boolean): Promise<void> {
    await this.wordModel.updateOne({
      _id: wordId,
    }, {
      hasAudio,
    }).exec();
  }
}
