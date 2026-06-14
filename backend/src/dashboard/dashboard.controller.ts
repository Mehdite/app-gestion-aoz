import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Statistiques du tableau de bord' })
  getStats() {
    return this.service.getStats();
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Contrats arrivant à échéance' })
  getExpiringContracts(@Query('days') days = 30) {
    return this.service.getExpiringContracts(Number(days));
  }
}
