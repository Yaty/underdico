import { Body, Controller, HttpException, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { User } from './models/user.model';
import { TokenResponseDto } from './dto/token-response.dto';
import { TokenDto } from './dto/token.dto';
import { RegisterDto } from './dto/register.dto';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { JoiValidationPipe } from '../shared/pipes/joi.pipe';
import { loginValidationSchema } from './validators/login.validation';
import { registerValidationSchema } from './validators/register.validation';

@Controller('users')
@ApiUseTags(User.modelName)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCreatedResponse({ type: UserDto })
  @ApiBadRequestResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'Register'))
  @UsePipes(new JoiValidationPipe(registerValidationSchema))
  async register(@Body() dto: RegisterDto): Promise<UserDto> {
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
  @ApiOperation(GetOperationId(User.modelName, 'Login'))
  @UsePipes(new JoiValidationPipe(loginValidationSchema))
  async login(@Body() dto: TokenDto): Promise<TokenResponseDto> {
    return this.userService.login(dto);
  }
}
