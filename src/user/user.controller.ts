import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Request,
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

@Controller('users')
@ApiUseTags(User.modelName)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

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
    @Request() req,
  ): Promise<UserDto> {
    const user = await this.userService.updateUser(params.userId, dto, req.user);
    return this.userService.mapper.map(user);
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
    @Request() req,
    @Response() res,
    @UploadedFile() file,
  ): Promise<void> {
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
      throw new BadRequestException('Invalid mimetype, only image/jpeg and image/png is allowed');
    }

    const user = await this.userService.findUserById(params.userId);

    if (UserService.objectIdToString(user._id) !== UserService.objectIdToString(req.user._id)) {
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
    @Request() req,
    @Response() res,
  ): Promise<void> {
    const user = await this.userService.findUserById(params.userId);
    req.pipe(request(this.storageService.getFileUrl(UserService.objectIdToString(user._id)))).pipe(res);
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
    @Request() req,
    @Response() res,
  ) {
    const user = await this.userService.findUserById(params.userId);

    if (UserService.objectIdToString(user._id) !== UserService.objectIdToString(req.user._id)) {
      throw new ForbiddenException();
    }

    await this.storageService.delete(UserService.objectIdToString(user._id));
    res.sendStatus(204);
  }
}
