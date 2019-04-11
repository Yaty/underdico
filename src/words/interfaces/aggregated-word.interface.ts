import { Document, SchemaTypes } from 'mongoose';

export interface AggregatedWord extends Document {
  readonly word: string;
  readonly definition: string;
  readonly userId: SchemaTypes.ObjectId;
  readonly tags: string[];
  readonly score: number;
  readonly userUpVoted: boolean;
  readonly userDownVoted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
