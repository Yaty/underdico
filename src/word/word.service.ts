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
import { Sort } from './interfaces/sort.interface';

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
    newWord.locale = word.locale;

    const result = await this.create(newWord);

    return {
      user: owner,
      score: 0,
      ...result.toJSON(),
    };
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

  private buildPipeline(skip?: number, take?: number, where?: object, sort?: Sort): object[] {
    const pipeline = [];

    if (where) {
      pipeline.push({
        $match: where,
      });
    }

    // FIXME: where is not working because of this stuff
    pipeline.push({
      $lookup: this.votesLookupOption,
    }, {
      $unwind: '$votes',
    }, {
      $group: {
        _id: '$_id',
        votes: {
          $push: '$votes',
        },
        score: {
          $sum: {
            $cond: [
              '$votes.value',
              1,
              -1,
            ],
          },
        },
        userId: {
          $first: '$userId',
        },
        definition: {
          $first: '$definition',
        },
        createdAt: {
          $first: '$createdAt',
        },
        updatedAt: {
          $first: '$updatedAt',
        },
        name: {
          $first: '$name',
        },
        tags: {
          $first: '$tags',
        },
        locale: {
          $first: '$locale',
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

    // Paginate
    if (typeof skip === 'number' && skip > 0) {
      pipeline.push({
        $skip: skip,
      });
    }

    if (typeof take === 'number' && take > 0) {
      pipeline.push({
        $limit: take,
      });
    }

    // Add user
    pipeline.push({
      $lookup: this.usersLookupOption,
    }, {
      $unwind: '$user',
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

  async getRandomWord(locale?: string): Promise<Word> {
    const count = await this.count({
      locale,
    });

    const random = Math.floor(Math.random() * count);

    return this.wordModel.findOne()
      .where(locale ? {
        locale,
      } : {})
      .skip(random)
      .lean()
      .exec();
  }

  async getRandomWordId(locale?: string): Promise<string> {
    const word = await this.getRandomWord(locale);
    return BaseService.objectIdToString(word._id);
  }

  getDailyWordId(locale?: string): Promise<string> {
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
}
