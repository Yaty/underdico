import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Res,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiImplicitFile,
  ApiImplicitParam,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnprocessableEntityResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { User } from './models/user.model';
import { TokenResponseDto } from './dto/token-response.dto';
import { CredentialsDto } from './dto/credentials.dto';
import { RegisterDto } from './dto/register.dto';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { UpdateParamsDto } from './dto/update-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from './models/user-role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../shared/guards/roles.guard';
import { FindByIdParamsDto } from './dto/find-by-id-params.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../shared/storage/storage.service';
import { UploadAvatarParams } from './dto/upload-avatar-params.dto';
import { DownloadAvatarParams } from './dto/download-avatar-params.dto';
import { DeleteAvatarParams } from './dto/delete-avatar-params.dto';
import * as request from 'request';
import { User as GetUser } from '../shared/decorators/user.decorator';
import { Pagination } from '../shared/decorators/pagination.decorator';
import { Where } from '../shared/decorators/where.decorator';
import { Sort } from '../shared/decorators/sort.decorator';

@Controller('users')
@ApiUseTags(User.modelName)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Roles(UserRole.Admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOkResponse({ type: UserDto, isArray: true })
  @ApiOperation(GetOperationId(User.modelName, 'GetUsers'))
  async getUsers(
    @Res() res,
    @Pagination() range,
    @Where() where,
    @Sort() sort,
  ): Promise<void> {
    const { skip, take, limit } = range;

    const {
      users,
      count,
    } = await this.userService.getUsers(skip, take, where, sort);

    res.set('Content-Range', `${skip}-${skip + users.length - 1}/${count}`);
    res.set('Accept-Range', `${User.modelName} ${limit}`);
    res.json(this.userService.mapper.mapArray(users));
  }

  @Post()
  @ApiCreatedResponse({ type: UserDto })
  @ApiConflictResponse({ type: ApiException })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'Register'))
  async register(
    @Body() dto: RegisterDto,
  ): Promise<UserDto> {
    const [usernameExists, emailExists] = await Promise.all([
      this.userService.findOne({
        username: dto.username,
      }),
      this.userService.findOne({
        email: dto.email,
      }),
    ]);

    if (usernameExists) {
      throw new HttpException(`Username already exists`, HttpStatus.CONFLICT);
    }

    if (emailExists) {
      throw new HttpException(`Email already exists`, HttpStatus.CONFLICT);
    }

    const newUser = await this.userService.register(dto);
    return this.userService.mapper.map(newUser);
  }

  @Post('token')
  @ApiCreatedResponse({ type: TokenResponseDto })
  @ApiBadRequestResponse({ type: ApiException })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'Login'))
  async login(@Body() dto: CredentialsDto): Promise<TokenResponseDto> {
    return this.userService.login(dto);
  }

  @Get(':userId')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOkResponse({ type: UserDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'FindById'))
  @ApiImplicitParam({ name: 'userId', required: true })
  async findById(
    @Param() params: FindByIdParamsDto,
  ): Promise<UserDto> {
    const user = await this.userService.findUserById(params.userId);
    return this.userService.mapper.map(user);
  }

  @Delete(':userId')
  @HttpCode(204)
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiNoContentResponse({})
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'DeleteById'))
  @ApiImplicitParam({ name: 'userId', required: true })
  async deleteById(
    @Param() params: FindByIdParamsDto,
    @GetUser() user,
  ): Promise<void> {
    if (user.role === UserRole.User && user._id.toString() !== params.userId) {
      throw new ForbiddenException('Not you');
    }

    await this.userService.deleteById(params.userId);
  }

  @Patch(':userId')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOkResponse({ type: UserDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'Update'))
  @ApiImplicitParam({ name: 'userId', required: true })
  async update(
    @Param() params: UpdateParamsDto,
    @Body() dto: UpdateUserDto,
    @GetUser() user,
  ): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(params.userId, dto, user);
    return this.userService.mapper.map(updatedUser);
  }

  @Put(':userId/avatar')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiNoContentResponse({})
  @ApiNotFoundResponse({ type: ApiException })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiBadRequestResponse({ type: ApiException })
  @ApiImplicitParam({ name: 'userId', required: true })
  @ApiOperation(GetOperationId(User.modelName, 'UploadAvatar'))
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiImplicitFile({ name: 'file', required: true })
  async uploadAvatar(
    @Param() params: UploadAvatarParams,
    @GetUser() authenticatedUser,
    @Response() res,
    @UploadedFile() file,
  ): Promise<void> {
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
      throw new BadRequestException('Invalid mimetype, only image/jpeg and image/png is allowed');
    }

    const user = await this.userService.findUserById(params.userId);

    if (UserService.objectIdToString(authenticatedUser._id) !== UserService.objectIdToString(user._id)) {
      throw new ForbiddenException();
    }

    await this.storageService.upload(file, file.mimetype, UserService.objectIdToString(user._id));
    res.sendStatus(204);
  }

  @Get(':userId/avatar')
  @ApiOkResponse({})
  @ApiNotFoundResponse({ type: ApiException })
  @ApiImplicitParam({ name: 'userId', required: true })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'DownloadAvatar'))
  async downloadAvatar(
    @Param() params: DownloadAvatarParams,
    @Response() res,
  ): Promise<void> {
    const user = await this.userService.findUserById(params.userId);
    request(this.storageService.getFileUrl(UserService.objectIdToString(user._id))).pipe(res);
  }

  @Delete(':userId/avatar')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiNoContentResponse({})
  @ApiNotFoundResponse({ type: ApiException })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'DeleteAvatar'))
  async deleteAvatar(
    @Param() params: DeleteAvatarParams,
    @GetUser() authenticatedUser,
    @Response() res,
  ) {
    const user = await this.userService.findUserById(params.userId);

    if (UserService.objectIdToString(user._id) !== UserService.objectIdToString(authenticatedUser._id)) {
      throw new ForbiddenException();
    }

    await this.storageService.delete(UserService.objectIdToString(user._id));
    res.sendStatus(204);
  }
}
