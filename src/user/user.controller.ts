import { Body, Controller, HttpException, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { User } from './models/user.model';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
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

  @Post('register')
  @ApiCreatedResponse({ type: UserDto })
  @ApiBadRequestResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'Register'))
  @UsePipes(new JoiValidationPipe(registerValidationSchema))
  async register(@Body() dto: RegisterDto): Promise<UserDto> {
    let exist;

    try {
      exist = await this.userService.findOne({
        username: dto.username,
      });
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (exist) {
      throw new HttpException(`${dto.username} exists`, HttpStatus.BAD_REQUEST);
    }

    const newUser = await this.userService.register(dto);
    return this.userService.map<UserDto>(newUser);
  }

  @Post('login')
  @ApiCreatedResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'Login'))
  @UsePipes(new JoiValidationPipe(loginValidationSchema))
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.userService.login(dto);
  }
}
