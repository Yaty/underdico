import { Injectable } from '@nestjs/common';
import { BaseMapper } from './base.mapper';
import { morphism } from 'morphism';
import { Vote } from '../../vote/models/vote.model';
import { VoteDto } from '../../vote/dto/vote.dto';

@Injectable()
export class VoteMapper extends BaseMapper<VoteDto, Vote> {
  constructor() {
    super({
      id: '_id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      value: 'value',
      userId: 'userId',
      wordId: 'wordId',
    });
  }

  public map(vote: Vote): VoteDto {
    return morphism(this.schema, vote);
  }

  public mapArray(input: Vote[]): VoteDto[] {
    return input.map(this.map);
  }
}
