import { Injectable } from '@nestjs/common';
import { get } from 'config';

@Injectable()
export class ConfigurationService {
  private environmentHosting: string = process.env.NODE_ENV || 'development';

  get(name: string): string {
    return get(name);
  }

  get isDevelopment(): boolean {
    return this.environmentHosting === 'development';
  }
}
