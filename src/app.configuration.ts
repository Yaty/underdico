import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as packageJson from 'pjson';
import { CallHandler, ExecutionContext, NestInterceptor, ValidationPipe } from '@nestjs/common';
import { CustomValidationError } from './shared/errors/custom-validation.error';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { RedisIoAdapter } from './shared/adapters/redis-io.adapter';
import { Observable } from 'rxjs';
import { json } from 'body-parser';
import { join } from 'path';

class ExposeHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    response.set('Access-Control-Expose-Headers', 'Content-Range,Accept-Range');
    return next.handle();
  }
}

export function configure(app) {
  const hostDomain = AppModule.isDev ? `https://${AppModule.host}:${AppModule.port}` : AppModule.host;

  app.useStaticAssets(join(__dirname, '../static'));

  const swaggerOptions = new DocumentBuilder()
    .setTitle(packageJson.name)
    .setDescription(packageJson.description)
    .setVersion(packageJson.version)
    .setBasePath('/api')
    .addBearerAuth('Authorization', 'header', 'apiKey')
    .setSchemes('https')
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerOptions);

  SwaggerModule.setup('/explorer', app, swaggerDoc, {
    swaggerUrl: `${hostDomain}/explorer`,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  app.getHttpAdapter().get('/swagger.json', (req, res) => {
    res.json(swaggerDoc);
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    exceptionFactory: (errors) => new CustomValidationError(errors),
  }));

  app.useGlobalInterceptors(new ExposeHeadersInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new RedisIoAdapter(app));

  app.enableCors({
    credentials: true,
    origin(requestOrigin, cb) {
      cb(null, true);
    },
  });
}
