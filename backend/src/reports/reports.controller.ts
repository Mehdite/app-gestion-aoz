import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('contracts')
  @ApiOperation({ summary: 'Rapport des contrats' })
  getContracts(
    @Query('startDate') startDate?: string, @Query('endDate') endDate?: string,
    @Query('companyId') companyId?: string, @Query('type') type?: string,
  ) {
    return this.service.getContractsReport({ startDate, endDate, companyId, type });
  }

  @Get('contracts/excel')
  @ApiOperation({ summary: 'Export Excel des contrats' })
  async getContractsExcel(
    @Query('startDate') startDate?: string, @Query('endDate') endDate?: string,
    @Query('companyId') companyId?: string, @Query('type') type?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.service.generateContractsExcel({ startDate, endDate, companyId, type });
    res!.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contrats-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    res!.send(buffer);
  }

  @Get('commissions')
  @ApiOperation({ summary: 'Rapport des commissions' })
  getCommissions(
    @Query('year') year = new Date().getFullYear(),
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getCommissionsReport({ year: Number(year), companyId });
  }

  @Get('claims')
  @ApiOperation({ summary: 'Rapport des sinistres' })
  getClaims(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.getClaimsReport({ startDate, endDate });
  }
}
