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

    res.status(error.getStatus()).json({
      statusCode: error.getStatus(),
      error: error.response.error,
      message: error.response.message || error.message,
      errors: error.errors,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
