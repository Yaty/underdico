import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../shared/base.mapper';
import { morphism, StrictSchema } from 'morphism';
import { WordDto } from '../dto/word.dto';
import { Word } from '../models/word.model';
import { BaseService } from '../../shared/base.service';

@Injectable()
export class WordMapper extends BaseMapper<WordDto, Word> {
  public map(word: Word, userId: string): WordDto {
    const userVote = word.votes.find(
      (vote) => BaseService.objectIdToString(vote.userId) === userId,
    );

    const schema: StrictSchema<WordDto, Word> = {
      id: '_id',
      userId: 'userId',
      definition: 'definition',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      name: 'name',
      tags: 'tags',
      score: () => word.votes.reduce((score, vote) => score + Number(vote.value), 0),
      userDownVoted: () => userVote && userVote.value === false || false,
      userUpVoted: () => userVote && userVote.value === true || false,
      userVoteId: () => userVote && userVote.id,
    };

    return morphism(schema, word);
  }
}
