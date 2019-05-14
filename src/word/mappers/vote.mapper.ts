import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../shared/base.mapper';
import { morphism } from 'morphism';
import { Vote } from '../models/word.model';
import { VoteDto } from '../dto/vote.dto';

@Injectable()
export class VoteMapper extends BaseMapper<VoteDto, Vote> {
  constructor() {
    super({
      id: '_id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      value: 'value',
      userId: 'userId',
    });
  }

  public map(vote: Vote): VoteDto {
    return morphism(this.schema, vote);
  }
}
