import { Model } from 'mongoose';
import { Inject, Injectable } from '@nestjs/common';
import { Word } from './interfaces/word.interface';
import { CreateWordDto } from './dto/create-word.dto';
import { AggregatedWord } from './interfaces/aggregated-word.interface';

@Injectable()
export class WordsService {
  constructor(@Inject('WORD_MODEL') private readonly wordModel: Model<Word>) {}

  create(createWordDto: CreateWordDto): Promise<Word> {
    const createdWord = new this.wordModel(createWordDto);
    return createdWord.save();
  }

  findAll(take: number, skip: number, authenticatedUserId?: string): Promise<AggregatedWord[]> {
    return this.wordModel.aggregate()
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
          $sum: '$votes.score',
        },
        userUpVoted: authenticatedUserId ? {
          $in: [authenticatedUserId, '$votes.userId'],
        } : {
          $toBool: false,
        },
        userDownVoted: authenticatedUserId ? {
          $ne: '$userUpVoted',
        } : {
          $toBool: false,
        },
      })
      .exec();
  }
}
