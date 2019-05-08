/*

import { Test, TestingModule } from '@nestjs/testing';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { DatabaseModule } from '../database/database.module';
import { WordDto } from './dto/word.dto';

import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import { Word } from './interfaces/word.interface';
import { wordsProviders } from './words.providers';

describe('Words Service', () => {
  let model: Model<Word>;
  let controller: WordController;
  let service: WordService;

  beforeEach(async () => {
    const mongod = new MongoMemoryServer();

    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      controllers: [WordController],
      providers: [WordService, {
        provide: 'DATABASE_CONNECTION',
        useFactory: async (): Promise<typeof mongoose> =>
          mongoose.connect(await mongod.getConnectionString(), {
            useNewUrlParser: true,
          }),
      }, ...wordsProviders],
    }).compile();

    controller = module.get(WordController);
    service = module.get(WordService);
    model = module.get('WORD_MODEL');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a word', async () => {
    const result = {};
    expect(await service.create({} as WordDto)).toBe(result);
  });

  it('should find all words', async () => {
    const result = ['test'];
    jest.spyOn(model, 'aggregate').mockImplementation((): any => result);
    expect(await service.findAll(10, 10)).toBe(result);
  });
});

*/
