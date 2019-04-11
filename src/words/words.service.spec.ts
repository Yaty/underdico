import { Test, TestingModule } from '@nestjs/testing';
import { WordsService } from './words.service';

describe('WordService', () => {
  let service: WordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordsService],
    }).compile();

    service = module.get<WordsService>(WordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find all words', async () => {
    const res = await service.findAll(10, 5, 'someUserId');
    expect(res).toHaveLength(10);
  });
});
