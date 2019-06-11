import { IoAdapter } from '@nestjs/platform-socket.io';
import * as redisIoAdapter from 'socket.io-redis';
import { ConfigurationService } from '../configuration/configuration.service';
import { Configuration } from '../configuration/configuration.enum';

export class RedisIoAdapter extends IoAdapter {
  private readonly redisAdapter: unknown;

  constructor() {
    super();

    const configService = new ConfigurationService();

    const options = {
      host: configService.get(Configuration.REDIS_HOST),
      port: Number(configService.get(Configuration.REDIS_PORT)),
      db: Number(configService.get(Configuration.REDIS_DB)),
      password: configService.get(Configuration.REDIS_PASSWORD),
      keyPrefix: configService.get(Configuration.REDIS_PREFIX),
    };

    if (!options.password) {
      delete options.password;
    }

    this.redisAdapter = redisIoAdapter(options);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.redisAdapter);
    return server;
  }
}
