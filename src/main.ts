import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configure } from './app.configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configure(app);
  await app.listen(AppModule.port);
}

bootstrap();
