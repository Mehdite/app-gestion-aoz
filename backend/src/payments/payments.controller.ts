import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un paiement' })
  create(@Body() data: any) { return this.service.create(data); }

  @Get()
  @ApiOperation({ summary: 'Liste des paiements' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('clientId') clientId?: string, @Query('contractId') contractId?: string,
    @Query('status') status?: string,
  ) { return this.service.findAll({ page, limit, clientId, contractId, status }); }

  @Get('overdue')
  @ApiOperation({ summary: 'Paiements en retard' })
  getOverdue() { return this.service.getOverdue(); }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Marquer comme payé' })
  markPaid(@Param('id') id: string, @Body('method') method?: string) {
    return this.service.markPaid(id, method);
  }
}
