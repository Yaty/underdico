import { IoAdapter } from '@nestjs/platform-socket.io';
import * as redisIoAdapter from 'socket.io-redis';
import { ConfigurationService } from '../configuration/configuration.service';
import { Configuration } from '../configuration/configuration.enum';

const configService = new ConfigurationService();

const redisOptions = {
  host: configService.get(Configuration.REDIS_HOST),
  port: Number(configService.get(Configuration.REDIS_PORT)),
  db: Number(configService.get(Configuration.REDIS_DB)),
  keyPrefix: configService.get(Configuration.REDIS_PREFIX),
};

const redisAdapter = redisIoAdapter(redisOptions);

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(redisAdapter);
    return server;
  }
}
