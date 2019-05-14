import * as Joi from 'joi';
import { PipeTransform, Injectable, ArgumentMetadata, UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class JoiValidationPipe implements PipeTransform<any> {
  constructor(private readonly schema: Joi.ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    const {
      error,
    } = Joi.validate(value, this.schema, {
      convert: false,
    });

    if (error) {
      throw new UnprocessableEntityException('Validation failed', error.details);
    }

    return value;
  }
}
