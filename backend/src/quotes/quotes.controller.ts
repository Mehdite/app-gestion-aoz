import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un devis' })
  create(@Body() dto: CreateQuoteDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des devis' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('search') search?: string, @Query('status') status?: string,
    @Query('clientId') clientId?: string, @Query('type') type?: string,
  ) {
    return this.service.findAll({ page, limit, search, status, clientId, type });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un devis' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Envoyer un devis' })
  send(@Param('id') id: string) { return this.service.send(id); }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rejeter un devis' })
  reject(@Param('id') id: string) { return this.service.reject(id); }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convertir en contrat' })
  convert(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.convert(id, userId);
  }
}
