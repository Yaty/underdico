import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  SwaggerModule.setup('api', app, SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Underdico')
      .setDescription('The Underdico API description')
      .setVersion('1.0')
      .addTag('users')
      .addTag('words')
      .build(),
  ));

  await app.listen(3000);
}

bootstrap();
