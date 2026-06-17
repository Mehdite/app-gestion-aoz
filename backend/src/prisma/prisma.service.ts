import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }]
        : [],
    });
  }

  async onModuleInit() {
    this.logger.log('PrismaService initialized (lazy connect)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') return;
    const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');
    return Promise.all(models.map((modelKey) => this[modelKey as string]?.deleteMany?.()));
  }
}
