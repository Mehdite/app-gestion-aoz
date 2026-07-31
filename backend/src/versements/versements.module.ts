import { Module } from '@nestjs/common';
import { VersementsService } from './versements.service';
import { VersementsController } from './versements.controller';

@Module({
  controllers: [VersementsController],
  providers: [VersementsService],
  exports: [VersementsService],
})
export class VersementsModule {}
