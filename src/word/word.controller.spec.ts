/*
import { Test, TestingModule } from '@nestjs/testing';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { WordDto } from './dto/word.dto';
import { MongooseModule } from '@nestjs/mongoose';
import { Word } from './models/word.model';
import { WordMapper } from './mappers/word.mapper';
import { VoteMapper } from './mappers/vote.mapper';

describe('Words Controller', () => {
  let controller: WordController;
  let service: WordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forFeature([{
          name: Word.modelName,
          schema: Word.model.schema,
        }]),
      ],
      controllers: [WordController],
      providers: [WordService, WordMapper, VoteMapper],
    }).compile();

    controller = module.get<WordController>(WordController);
    service = module.get<WordService>(WordService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a sanitized word', async () => {
    const result = {};
    jest.spyOn(service, 'create').mockImplementation((): any => result);
    expect(await controller.create({} as WordDto, )).toBe(result);
  });

  it('should find all words', async () => {
    const result = ['test'];
    jest.spyOn(service, 'findAll').mockImplementation((): any => result);
    expect(await controller.findAll({})).toBe(result);
  });
});
*/
