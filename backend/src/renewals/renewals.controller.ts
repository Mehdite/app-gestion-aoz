import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RenewalsService } from './renewals.service';

@ApiTags('renewals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('renewals')
export class RenewalsController {
  constructor(private readonly service: RenewalsService) {}

  @Get()
  @ApiOperation({ summary: 'Contrats arrivant à échéance sur un mois + taux de renouvellement' })
  getRenewals(@Query('month') month?: string, @Query('companyCode') companyCode?: string) {
    return this.service.getRenewals(month, companyCode);
  }
}
