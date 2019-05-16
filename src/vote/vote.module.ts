import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vote } from './models/vote.model';
import { VoteService } from './vote.service';
import { VoteMapper } from '../shared/mappers/vote.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Vote.modelName,
      schema: Vote.model.schema,
    }]),
  ],
  providers: [VoteService, VoteMapper],
  exports: [VoteService],
})
export class VoteModule {}
