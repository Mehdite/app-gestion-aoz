import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RistournesService } from './ristournes.service';
import { CreateRistourneDto } from './dto/create-ristourne.dto';

@ApiTags('ristournes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ristournes')
export class RistournesController {
  constructor(private readonly service: RistournesService) {}

  @Post()
  @ApiOperation({ summary: 'Enregistrer une ristourne (annule la production liée)' })
  create(@Body() dto: CreateRistourneDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des ristournes + total' })
  findAll(
    @Query('mois') mois?: string,
    @Query('companyCode') companyCode?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ mois, companyCode, search });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une ristourne (réactive la production)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
