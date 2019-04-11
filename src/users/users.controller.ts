import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './interfaces/user.interface';
import { ApiUseTags } from '@nestjs/swagger';

@Controller('users')
@ApiUseTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
   create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}
