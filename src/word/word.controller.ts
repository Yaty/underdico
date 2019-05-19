import { BadRequestException, Body, Controller, Get, HttpStatus, Param, Patch, Post, Query, Request, Response, UseGuards } from '@nestjs/common';
import { WordService } from './word.service';
import { WordDto } from './dto/word.dto';
import { Word } from './models/word.model';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiImplicitQuery,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiUnprocessableEntityResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { UserRole } from '../user/models/user-role.enum';
import { Roles } from '../shared/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../shared/guards/roles.guard';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { CreateWordDto } from './dto/create-word.dto';
import { CreateVoteDto } from '../vote/dto/create-vote.dto';
import { VoteDto } from '../vote/dto/vote.dto';
import { CreateVoteParamsDto } from './dto/create-vote-params.dto';
import { UpdateVoteParamsDto } from './dto/update-vote-params.dto';
import { VoteMapper } from '../shared/mappers/vote.mapper';
import { OptionalJwtAuthGuard } from '../shared/guards/optional-jwt-auth.guard';

@Controller('words')
@ApiUseTags(Word.modelName)
@ApiBearerAuth()
export class WordController {
  constructor(
    private readonly wordService: WordService,
    private readonly voteMapper: VoteMapper,
  ) {}

  @Post()
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiCreatedResponse({ type: WordDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'Create'))
  async create(
    @Request() req,
    @Response() res,
    @Body() dto: CreateWordDto,
  ): Promise<void> {
    const word = await this.wordService.createWord(dto, req.user);
    res.set('Location', `${req.protocol}://${req.get('host')}/api/words/${word.id}`);
    res.status(201).json(await this.wordService.mapper.map(word, req.user.id));
  }

  @Get()
  @ApiBadRequestResponse({ type: ApiException })
  @ApiResponse({ status: HttpStatus.OK, type: WordDto, isArray: true })
  @ApiOperation(GetOperationId(Word.modelName, 'FindAll'))
  @ApiImplicitQuery({ name: 'range', required: true, description: '0-50, limit is 50 by page' })
  async findAll(
    @Request() req,
    @Response() res,
    @Query('range') range,
  ): Promise<void> {
    const limit = 50;

    let skip = 0;
    let take = limit;

    if (range) {
      const rangeParams = range.split('-').map(Number);

      if (rangeParams.length !== 2) {
        throw new BadRequestException('Invalid range param');
      }

      const [startIndex, endIndex] = rangeParams;

      if (endIndex < startIndex) {
        throw new BadRequestException('Invalid range param');
      }

      skip = startIndex - 1;

      if (endIndex - startIndex + 1 > limit) {
        take = limit;
      } else {
        take = endIndex - startIndex + 1;
      }
    }

    const {
      words,
      count,
    } = await this.wordService.getAggregatedWords(skip, take);

    res.set('Content-Range', `${skip}-${skip + words.length}/${count}`);
    res.set('Accept-Range', `${Word.modelName} ${limit}`);
    res.status(200).json(
      this.wordService.mapper.mapArray(words, req.user && req.user.id),
    );
  }

  @Get('random')
  @ApiResponse({ status: HttpStatus.OK, type: WordDto })
  @ApiOperation(GetOperationId(Word.modelName, 'Random'))
  async random(
    @Request() req,
    @Response() res,
  ): Promise<void> {
    const wordId = await this.wordService.getRandomWordId();
    res.redirect(`${req.protocol}://${req.get('host')}/api/words/${wordId}`);
  }

  @Get(':wordId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponse({ status: HttpStatus.OK, type: WordDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'FindById'))
  async findById(
    @Param('wordId') wordId,
    @Request() req,
  ): Promise<WordDto> {
    const word = await this.wordService.findWordById(wordId);
    return this.wordService.mapper.map(word, req.user && req.user._id);
  }

  @Post(':wordId/votes')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiCreatedResponse({ type: VoteDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'CreateVote'))
  async createVote(
    @Param() params: CreateVoteParamsDto,
    @Body() dto: CreateVoteDto,
    @Request() req,
  ): Promise<VoteDto> {
    const vote = await this.wordService.createVote(params.wordId, dto.value, req.user);
    return this.voteMapper.map(vote);
  }

  @Patch(':wordId/votes/:voteId')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOkResponse({ type: VoteDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'UpdateVote'))
  async updateVote(
    @Param() params: UpdateVoteParamsDto,
    @Body() dto: CreateVoteDto,
    @Request() req,
  ): Promise<VoteDto> {
    const vote = await this.wordService.updateVote(params.wordId, params.voteId, dto.value, req.user);
    return this.voteMapper.map(vote);
  }
}
