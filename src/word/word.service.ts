import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Word } from './models/word.model';
import { WordDto } from './dto/word.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { BaseService } from '../shared/base.service';
import { CreateWordDto } from './dto/create-word.dto';
import { User } from '../user/models/user.model';
import { WordMapper } from './mappers/word.mapper';
import { VoteMapper } from './mappers/vote.mapper';
import { Vote } from './models/vote.model';

@Injectable()
export class WordService extends BaseService<Word, WordDto>  {
  constructor(
    @InjectModel(Word.modelName) private readonly wordModel: ModelType<Word>,
    mapper: WordMapper,
    public readonly voteMapper: VoteMapper,
  ) {
    super(wordModel, mapper);
  }

  async createWord(word: CreateWordDto, owner: User): Promise<Word> {
    const newWord = Word.createModel();

    newWord.name = word.name;
    newWord.definition = word.definition;
    newWord.tags = word.tags;
    newWord.userId = BaseService.toObjectId(owner.id);
    newWord.votes = [];

    const result = await this.create(newWord);
    return result.toJSON() as Word;
  }

  async getAggregatedWords(skip: number, take: number): Promise<{
    words: Word[],
    count: number,
  }> {
    const [
      words,
      count,
    ] = await Promise.all([
      this.wordModel.find().limit(take).skip(skip).sort({
        createdAt: 'ascending',
      }).lean().exec(),
      this.count(),
    ]);

    return {
      words,
      count,
    };
  }

  async findWordById(id: string): Promise<Word> {
    const word = await this.wordModel.findById(id).lean().exec();

    if (!word) {
      throw new NotFoundException('Word not found');
    }

    return word;
  }

  async getRandomWordId(): Promise<string> {
    const count = await this.count();
    const random = Math.floor(Math.random() * count);
    const word = await this.wordModel.findOne().skip(random).lean().exec();
    return word._id;
  }

  private async wordDoNotExists(wordId: string): Promise<boolean> {
    return (await this.count({
      _id: wordId,
    })) === 0;
  }

  private async userAlreadyVoted(wordId: string, user: User): Promise<boolean> {
    return (await this.count({
      '_id': wordId,
      'votes.userId': user.id,
    })) !== 0;
  }

  private getUserVoteInWord(word: Word, user: User): Vote {
    return word.votes.find((v) => WordService.objectIdToString(v.userId) === user.id);
  }

  private async addVote(wordId: string, voteValue: boolean, user: User): Promise<Vote> {
    const newVote = Vote.createModel();
    newVote.userId = WordService.toObjectId(user.id);
    newVote.value = voteValue;

    const word = await this.wordModel.findOneAndUpdate({
      _id: wordId,
    }, {
      $push: {
        votes: newVote,
      },
    }, {
      new: true,
    }).lean().exec();

    return this.getUserVoteInWord(word, user);
  }

  async createVote(wordId: string, voteValue: boolean, user: User): Promise<Vote> {
    const wordDoNotExists = await this.wordDoNotExists(wordId);

    if (wordDoNotExists) {
      throw new NotFoundException('Word not found');
    }

    const userAlreadyVoted = await this.userAlreadyVoted(wordId, user);

    if (userAlreadyVoted) {
      throw new ConflictException('This user already voted for this word');
    }

    return this.addVote(wordId, voteValue, user);
  }

  async updateVote(wordId: string, voteId: string, voteValue: boolean, user: User): Promise<Vote> {
    const wordDoNotExists = await this.wordDoNotExists(wordId);

    if (wordDoNotExists) {
      throw new NotFoundException('Word not found');
    }

    const vote = await this.wordModel.findOne({
      '_id': wordId,
      'votes._id': voteId,
    }, {
      'votes.$': 1,
    }).lean().exec();

    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    if (vote.userId !== user.id) {
      throw new ForbiddenException('This is not your vote');
    }

    const word = await this.wordModel.updateOne({
      '_id': wordId,
      'votes.userId': user.id,
    }, {
      $set: {
        'votes.$.value': voteValue,
      },
    }, {
      new: true,
    }).lean().exec();

    return this.getUserVoteInWord(word, user);
  }
}
