import * as Joi from 'joi';
import { PipeTransform, Injectable, ArgumentMetadata, UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly schema: Joi.ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    // todo : values is undefined?
    const {
      error,
    } = Joi.validate(value, this.schema);

    if (error) {
      throw new UnprocessableEntityException('Validation failed', error.details);
    }

    return value;
  }
}
