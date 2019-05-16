import { Injectable } from '@nestjs/common';
import { BaseMapper } from './base.mapper';
import { morphism, StrictSchema } from 'morphism';
import { WordDto } from '../../word/dto/word.dto';
import { Word } from '../../word/models/word.model';
import { BaseService } from '../base.service';
import { Vote } from '../../vote/models/vote.model';
import { Types } from 'mongoose';

@Injectable()
export class WordMapper extends BaseMapper<WordDto, Word> {
  public map(word: Word, userId?: Types.ObjectId): WordDto {
    const schema: StrictSchema<WordDto, Word> = {
      id: '_id',
      userId: 'userId',
      definition: 'definition',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      name: 'name',
      tags: 'tags',
      score: () => word.votes.reduce((score, vote: Vote) => score + (vote.value ? 1 : -1), 0),
    };

    if (userId) {
      const userIdStr = BaseService.objectIdToString(userId);

      const userVote = word.votes.find(
        (vote: Vote) => BaseService.objectIdToString(vote.userId) === userIdStr,
      ) as Vote;

      Object.assign(schema, {
        userDownVoted: () => userVote && userVote.value === false || false,
        userUpVoted: () => userVote && userVote.value === true || false,
        userVoteId: () => userVote && userVote.id,
      });
    }

    return morphism(schema, word);
  }

  public mapArray(input: Word[], userId: Types.ObjectId): WordDto[] {
    return input.map((word) => this.map(word, userId));
  }
}
