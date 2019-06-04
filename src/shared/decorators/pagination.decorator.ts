import { BadRequestException, createParamDecorator } from '@nestjs/common';

export const Pagination = createParamDecorator((data, req) => {
  const range = req.query.range;
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

    skip = startIndex;

    if (endIndex - startIndex + 1 > limit) {
      take = limit;
    } else {
      take = endIndex - startIndex + 1;
    }
  }

  return [skip, take, limit];
});
