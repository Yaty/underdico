import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../shared/base.mapper';
import { morphism, StrictSchema } from 'morphism';
import { WordDto } from './dto/word.dto';
import { Word } from './models/word.model';
import { BaseService } from '../shared/base.service';

@Injectable()
export class WordMapper extends BaseMapper<WordDto, Word> {
  private hasVoted(voteValue, userId, votes): boolean {
    return votes.findIndex((vote) => BaseService.objectIdToString(vote.userId) === userId && vote.value === voteValue) !== -1;
  }

  public map(word: Word, userId: string): WordDto {
    const schema: StrictSchema<WordDto, Word> = {
      id: '_id',
      userId: 'userId',
      definition: 'definition',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      name: 'name',
      tags: 'tags',
      score: (iteratee) => iteratee.votes.reduce((score, vote) => score + Number(vote.value), 0),
      userDownVoted: (iteratee) => this.hasVoted(false, userId, iteratee.votes),
      userUpVoted: (iteratee) => this.hasVoted(true, userId, iteratee.votes),
    };

    return morphism(schema, word);
  }
}
