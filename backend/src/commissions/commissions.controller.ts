import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommissionsService } from './commissions.service';

@ApiTags('commissions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des commissions' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('period') period?: string, @Query('companyId') companyId?: string,
    @Query('agentId') agentId?: string, @Query('isPaid') isPaid?: boolean,
  ) {
    return this.service.findAll({ page, limit, period, companyId, agentId, isPaid });
  }

  @Get('report')
  @ApiOperation({ summary: 'Rapport mensuel des commissions' })
  getMonthlyReport(@Query('year') year = new Date().getFullYear()) {
    return this.service.getMonthlyReport(Number(year));
  }

  @Post('mark-paid')
  @ApiOperation({ summary: 'Marquer des commissions comme payées' })
  markPaid(@Body('ids') ids: string[]) {
    return this.service.markPaid(ids);
  }
}
