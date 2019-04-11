import { Document, SchemaTypes } from 'mongoose';

interface Vote {
  readonly userId: SchemaTypes.ObjectId;
  readonly score: number;
}

export interface Word extends Document {
  readonly word: string;
  readonly definition: string;
  readonly userId: SchemaTypes.ObjectId;
  readonly tags: string[];
  readonly votes: Vote[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
