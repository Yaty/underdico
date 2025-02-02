import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { BaseService } from '../shared/base.service';
import { User } from '../user/models/user.model';
import { VoteMapper } from '../shared/mappers/vote.mapper';
import { Vote } from './models/vote.model';
import { VoteDto } from './dto/vote.dto';

@Injectable()
export class VoteService extends BaseService<Vote, VoteDto>  {
  constructor(
    @InjectModel(Vote.modelName) private readonly voteModel: ModelType<Vote>,
    public readonly mapper: VoteMapper,
  ) {
    super(voteModel, mapper);
  }

  private async userVoteExistsForAWord(wordId: string, userId: string): Promise<boolean> {
    return (await this.voteModel.countDocuments({
      wordId,
      userId,
    })) > 0;
  }

  async createVote(wordId: string, voteValue: boolean, user: User): Promise<Vote> {
    const userVoteExistsForAWord = await this.userVoteExistsForAWord(wordId, BaseService.objectIdToString(user._id));

    if (userVoteExistsForAWord) {
      throw new ConflictException('A vote already exists for this word by this user');
    }

    return this.voteModel.create({
      wordId: VoteService.toObjectId(wordId),
      userId: user._id,
      value: voteValue,
    });
  }

  async updateVote(voteId: string, voteValue: boolean, user: User): Promise<Vote> {
    if (BaseService.isInvalidObjectId(voteId)) {
      throw new NotFoundException('Vote not found');
    }

    const vote = await this.voteModel.findOne({
      _id: voteId,
    }).lean().exec();

    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    if (BaseService.objectIdToString(vote.userId) !== BaseService.objectIdToString(user._id)) {
      throw new ForbiddenException('This is not your vote');
    }

    return this.voteModel.findOneAndUpdate({
      _id: voteId,
    }, {
      value: voteValue,
    }, {
      new: true,
    }).lean().exec();
  }

  async getTodayBestWordIdByVote(locale?: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const bestWords = await this.voteModel
      .aggregate()
      .match({
        updatedAt: {
          $gte: start,
          $lte: end,
        },
      })
      .lookup({
        from: 'words',
        localField: 'wordId',
        foreignField: '_id',
        as: 'word',
      })
      .unwind('word')
      .match(locale ? {
        'word.locale': locale,
      } : {})
      .group({
        _id: '$wordId',
        score: {
          $sum: {
            $cond: [
              '$value',
              1,
              -1,
            ],
          },
        },
      })
      .sort({
        score: -1,
      })
      .limit(1)
      .exec();

    if (bestWords.length === 0) {
      throw new NotFoundException('No daily word');
    }

    return BaseService.objectIdToString(bestWords[0]._id);
  }

  findUserVotes(userId: string): Promise<Vote[]> {
    return this.voteModel.find({
      userId,
    }).exec();
  }
}
