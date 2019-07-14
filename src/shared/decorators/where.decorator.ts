import { BadRequestException, createParamDecorator } from '@nestjs/common';

export const Where = createParamDecorator((data: any, req): object => {
  let where = {};

  if (req.query.where) {
    try {
      where = JSON.parse(req.query.where);
    } catch (err) {
      throw new BadRequestException('Invalid where JSON format');
    }
  }

  return where;
});
