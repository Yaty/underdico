import { Body, Controller, Get, HttpException, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiImplicitParam,
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

@Controller('users')
@ApiUseTags(User.modelName)
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
