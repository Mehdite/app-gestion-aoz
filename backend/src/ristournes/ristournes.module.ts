import { Module } from '@nestjs/common';
import { RistournesService } from './ristournes.service';
import { RistournesController } from './ristournes.controller';

@Module({
  controllers: [RistournesController],
  providers: [RistournesService],
  exports: [RistournesService],
})
export class RistournesModule {}
