import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccountingService } from './accounting.service';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Post()
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Créer une écriture comptable' })
  create(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.service.createEntry(data, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Journal comptable' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string, @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll({ page, limit, type, startDate, endDate });
  }

  @Get('situation')
  @ApiOperation({ summary: 'Situation financière' })
  getSituation(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.getSituation(startDate, endDate);
  }
}
