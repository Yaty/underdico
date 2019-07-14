import { createParamDecorator } from '@nestjs/common';

export interface Sort {
  readonly field?: string;
  readonly ordering?: 'asc' | 'desc';
}

export const Sort = createParamDecorator((data: any, req): Sort | undefined => {
  if (req.query.sort) {
    const [field, ordering] = req.query.sort.split(',');

    return {
      field,
      ordering,
    };
  }
});
