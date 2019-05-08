import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const hostDomain = AppModule.isDev ? `${AppModule.host}:${AppModule.port}` : AppModule.host;

  SwaggerModule.setup('/swagger-ui.html', app, SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Underdico')
      .setDescription('The Underdico API description')
      .setVersion('1.0')
      .addTag('users')
      .addTag('words')
      .build(),
  ), {
    swaggerUrl: `${hostDomain}/api/docs-json`,
    explorer: true,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(AppModule.port);
}

bootstrap();
