import { createParamDecorator } from '@nestjs/common';
import { User as UserModel } from '../../user/models/user.model';
import { InstanceType } from 'typegoose';

export const User = createParamDecorator((data: any, req): InstanceType<UserModel> => {
  return req.user;
});
