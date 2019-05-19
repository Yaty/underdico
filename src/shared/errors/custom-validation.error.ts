import { HttpException, HttpStatus, ValidationError } from '@nestjs/common';
import { createHttpExceptionBody } from '@nestjs/common/utils/http-exception-body.util';

export class CustomValidationError extends HttpException {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super(
      createHttpExceptionBody('Validation Error', 'Validation Error', HttpStatus.UNPROCESSABLE_ENTITY),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    this.errors = errors;
  }
}
