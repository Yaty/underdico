import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    if (error.getStatus() === HttpStatus.UNAUTHORIZED) {
      if (typeof error.response !== 'string') {
        error.response.message =
          error.response.message || 'You do not have permission to access this resource';
      }
    }

    if (error.getStatus() === HttpStatus.UNPROCESSABLE_ENTITY) {
      error.response.errors = error.response.error;
      delete error.response.error;
    }

    res.status(error.getStatus()).json({
      statusCode: error.getStatus(),
      name: error.response.name || error.constructor.name,
      error: error.response.error,
      message: error.response.message || error.message,
      errors: error.response.errors,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
