import { Request, Response, Body, Controller, Get, Post, Query, UseGuards, UsePipes, BadRequestException } from '@nestjs/common';
import { WordService } from './word.service';
import { WordDto } from './dto/word.dto';
import { Word } from './models/word.model';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { UserRole } from '../user/models/user-role.enum';
import { Roles } from '../shared/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../shared/guards/roles.guard';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { JoiValidationPipe } from '../shared/pipes/joi.pipe';
import { createValidationSchema } from './validators/createValidationSchema';

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
  async create(@Request() req, @Response() res, @Body() dto: WordDto): Promise<WordDto> {
    // TODO : Add middleware to get user ID from JWT to put in word
    const word = await this.wordService.createWord(dto);
    res.headers.set('Location', `${req.protocol}://${req.get('host')}:${req.get('port')}/api/words/${word.id}`);
    return this.wordService.map<WordDto>(word);
  }

  @Get()
  @ApiBadRequestResponse({ type: ApiException })
  @ApiOperation(GetOperationId(Word.modelName, 'Find all'))
  async findAll(@Response() res, @Query() query): Promise<WordDto[]> {
    const range = query.range;
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

    res.headers.set('Content-Range', `${skip + 1}-${skip + take}/${count}`);
    res.headers.set('Accept-Range', `${Word.modelName} ${limit}`);

    return words;
  }
}
