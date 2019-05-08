import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startedAt: Date;

  constructor() {
    this.startedAt = new Date();
  }

  root(): any {
    return {
      startedAt: this.startedAt,
      uptime: process.uptime(),
    };
  }
}
