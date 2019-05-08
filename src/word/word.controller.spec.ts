/*
import { Test, TestingModule } from '@nestjs/testing';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { DatabaseModule } from '../database/database.module';
import { WordDto } from './dto/word.dto';

describe('Words Controller', () => {
  let controller: WordController;
  let service: WordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      controllers: [WordController],
      providers: [WordService, {
        provide: 'WORD_MODEL',
        useFactory: () => ({}),
      }],
    }).compile();

    controller = module.get<WordController>(WordController);
    service = module.get<WordService>(WordService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a word', async () => {
    const result = {};
    jest.spyOn(service, 'create').mockImplementation((): any => result);
    expect(await controller.create({} as WordDto)).toBe(result);
  });

  it('should find all words', async () => {
    const result = ['test'];
    jest.spyOn(service, 'findAll').mockImplementation((): any => result);
    expect(await controller.findAll({})).toBe(result);
  });
});

 */
