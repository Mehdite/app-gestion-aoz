import { Module } from '@nestjs/common';
import { QuittancesController } from './quittances.controller';
import { QuittancesService } from './quittances.service';

@Module({
  controllers: [QuittancesController],
  providers:   [QuittancesService],
})
export class QuittancesModule {}
