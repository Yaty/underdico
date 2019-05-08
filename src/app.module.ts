import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { WordModule } from './word/word.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigurationService } from './shared/configuration/configuration.service';
import { Configuration } from './shared/configuration/configuration.enum';

@Module({
  imports: [SharedModule, MongooseModule.forRootAsync({
    imports: [SharedModule],
    useFactory: (configService: ConfigurationService) => ({
      uri: configService.get(Configuration.MONGO_URI),
      retryDelay: 500,
      retryAttempts: 3,
      useNewUrlParser: true,
      useCreateIndex: true,
    }),
    inject: [ConfigurationService],
  }), UserModule, WordModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  static host: string;
  static port: number | string;
  static isDev: boolean;

  constructor(
    private readonly configurationService: ConfigurationService,
  ) {
    AppModule.port = AppModule.normalizePort(configurationService.get(Configuration.PORT));
    AppModule.host = configurationService.get(Configuration.HOST);
    AppModule.isDev = configurationService.isDevelopment;
  }

  private static normalizePort(param: number | string): number | string {
    const portNumber: number = typeof param === 'string' ? parseInt(param, 10) : param;

    if (isNaN(portNumber)) {
      return param;
    } else if (portNumber >= 0) {
      return portNumber;
    }
  }
}
