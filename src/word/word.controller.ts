import {
  Request,
  Response,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UsePipes,
  BadRequestException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { WordService } from './word.service';
import { WordDto } from './dto/word.dto';
import { Word } from './models/word.model';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiImplicitQuery, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { UserRole } from '../user/models/user-role.enum';
import { Roles } from '../shared/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../shared/guards/roles.guard';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { JoiValidationPipe } from '../shared/pipes/joi.pipe';
import { createValidationSchema } from './validators/createValidationSchema';
import { CreateWordDto } from './dto/create-word.dto';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { User } from '../user/models/user.model';

@Controller('words')
@ApiUseTags(Word.modelName)
@ApiBearerAuth()
export class WordController {
  constructor(private readonly wordService: WordService) {}

  @Post()
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiCreatedResponse({ type: WordDto })
  @ApiBadRequestResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'Create'))
  @UsePipes(new JoiValidationPipe(createValidationSchema))
  async create(
    @Request() req,
    @Response() res,
    @Body() dto: CreateWordDto,
    @CurrentUser() owner: User,
  ): Promise<WordDto> {
    try {
      const word = await this.wordService.createWord(dto, owner);
      res.set('Location', `${req.protocol}://${req.get('host')}:${req.get('port')}/api/words/${word.id}`);
      return this.wordService.map<WordDto>(word);
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiBadRequestResponse({ type: ApiException })
  @ApiResponse({ status: HttpStatus.OK, type: WordDto, isArray: true })
  @ApiOperation(GetOperationId(Word.modelName, 'FindAll'))
  @ApiImplicitQuery({ name: 'range', required: true, description: '0-50, limit is 50 by page' })
  async findAll(
    @Response() res,
    @Query('range') range,
    @CurrentUser({
      required: false,
    }) user?: User,
  ): Promise<WordDto[]> {
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

    try {
      const {
        words,
        count,
      } = await this.wordService.getAggregatedWords(skip, take, user);

      res.set('Content-Range', `${skip + 1}-${skip + take}/${count}`);
      res.set('Accept-Range', `${Word.modelName} ${limit}`);

      return words;
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
