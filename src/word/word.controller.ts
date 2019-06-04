import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { WordService } from './word.service';
import { WordDto } from './dto/word.dto';
import { Word } from './models/word.model';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiImplicitFile,
  ApiImplicitParam,
  ApiImplicitQuery,
  ApiNoContentResponse,
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
import { UploadAudioParams } from './dto/upload-audio-params.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { DownloadAudioParams } from './dto/download-audio-params.dto';
import { StorageService } from '../shared/storage/storage.service';
import { DeleteAudioParams } from './dto/delete-audio-params.dto';

@Controller('words')
@ApiUseTags(Word.modelName)
@ApiBearerAuth()
export class WordController {
  constructor(
    private readonly wordService: WordService,
    private readonly voteMapper: VoteMapper,
    private readonly storageService: StorageService,
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
    res.set('Location', `${req.protocol}://${req.get('host')}/api/words/${word._id}`);
    res.status(201).json(await this.wordService.mapper.map(word, req.user._id));
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBadRequestResponse({ type: ApiException })
  @ApiResponse({ status: HttpStatus.OK, type: WordDto, isArray: true })
  @ApiOperation(GetOperationId(Word.modelName, 'FindAll'))
  @ApiImplicitQuery({ name: 'range', description: '0-50, limit is 50 by page', required: false })
  @ApiImplicitQuery({ name: 'where', description: 'where filter', required: false })
  async findAll(
    @Request() req,
    @Response() res,
    @Query('range') range,
    @Query('where') where,
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

      skip = startIndex;

      if (endIndex - startIndex + 1 > limit) {
        take = limit;
      } else {
        take = endIndex - startIndex + 1;
      }
    }

    let serviceResponse;
    let words;
    let count;

    if (where) {
      try {
        where = JSON.parse(where);
      } catch (err) {
        throw new BadRequestException('Invalid where JSON format');
      }

      serviceResponse = await this.wordService.getAggregatedWordsWithFilter(take, where);
    } else {
      serviceResponse = await this.wordService.getAggregatedWords(skip, take);
    }

    words = serviceResponse.words;
    count = serviceResponse.count;

    res.set('Content-Range', `${skip}-${skip + words.length - 1}/${count}`);
    res.set('Accept-Range', `${Word.modelName} ${limit}`);

    const mappedWords = this.wordService.mapper.mapArray(words, req.user && req.user._id);
    res.status(200).json(mappedWords);
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

  @Get('daily')
  @ApiResponse({ status: HttpStatus.OK, type: WordDto })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'DailyWord'))
  async getDailyWord(
    @Request() req,
    @Response() res,
  ): Promise<void> {
    const wordId = await this.wordService.getDailyWordId();
    res.redirect(`${req.protocol}://${req.get('host')}/api/words/${wordId}`);
  }

  @Get(':wordId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponse({ status: HttpStatus.OK, type: WordDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiImplicitParam({ name: 'wordId', required: true })
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
  @ApiImplicitParam({ name: 'wordId', required: true })
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
  @ApiImplicitParam({ name: 'wordId', required: true })
  @ApiImplicitParam({ name: 'voteId', required: true })
  @ApiOperation(GetOperationId(Word.modelName, 'UpdateVote'))
  async updateVote(
    @Param() params: UpdateVoteParamsDto,
    @Body() dto: CreateVoteDto,
    @Request() req,
  ): Promise<VoteDto> {
    const vote = await this.wordService.updateVote(params.wordId, params.voteId, dto.value, req.user);
    return this.voteMapper.map(vote);
  }

  @Put(':wordId/audio')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiNoContentResponse({})
  @ApiNotFoundResponse({ type: ApiException })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiBadRequestResponse({ type: ApiException })
  @ApiImplicitParam({ name: 'wordId', required: true })
  @ApiOperation(GetOperationId(Word.modelName, 'UploadWordAudio'))
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiImplicitFile({ name: 'file', required: true })
  async uploadAudio(
    @Param() params: UploadAudioParams,
    @Request() req,
    @Response() res,
    @UploadedFile() file,
  ): Promise<void> {
    if (file.mimetype !== 'audio/mpeg') {
      throw new BadRequestException('Invalid mimetype, only audio/mpeg is allowed');
    }

    const word = await this.wordService.findWordById(params.wordId);

    if (WordService.objectIdToString(word.userId) !== WordService.objectIdToString(req.user._id)) {
      throw new ForbiddenException();
    }

    await this.storageService.upload(file, 'audio/mpeg', WordService.objectIdToString(word._id));
    res.sendStatus(204);
  }

  @Get(':wordId/audio')
  @ApiOkResponse({})
  @ApiNotFoundResponse({ type: ApiException })
  @ApiImplicitParam({ name: 'wordId', required: true })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'DownloadWordAudio'))
  async downloadAudio(
    @Param() params: DownloadAudioParams,
    @Response() res,
  ): Promise<void> {
    const word = await this.wordService.findWordById(params.wordId);
    res.redirect(this.storageService.getFileUrl(WordService.objectIdToString(word._id)));
  }

  @Delete(':wordId/audio')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiNoContentResponse({})
  @ApiNotFoundResponse({ type: ApiException })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'DeleteWordAudio'))
  async deleteAudio(
    @Param() params: DeleteAudioParams,
    @Request() req,
    @Response() res,
  ) {
    const word = await this.wordService.findWordById(params.wordId);

    if (WordService.objectIdToString(word.userId) !== WordService.objectIdToString(req.user._id)) {
      throw new ForbiddenException();
    }

    await this.storageService.delete(WordService.objectIdToString(word._id));
    res.sendStatus(204);
  }
}
