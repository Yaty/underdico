import { Connection } from 'mongoose';
import { WordSchema } from './schemas/word.schema';

export const wordsProviders = [
  {
    provide: 'WORD_MODEL',
    useFactory: (connection: Connection) => connection.model('Word', WordSchema),
    inject: ['DATABASE_CONNECTION'],
  },
];
