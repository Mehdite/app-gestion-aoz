import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des compagnies' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une compagnie' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Statistiques d\'une compagnie' })
  getStats(@Param('id') id: string) { return this.service.getStats(id); }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer une compagnie' })
  create(@Body() data: any) { return this.service.create(data); }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier une compagnie' })
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Post(':id/products')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Ajouter un produit à une compagnie' })
  addProduct(@Param('id') id: string, @Body() data: any) { return this.service.addProduct(id, data); }

  @Post('seed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Initialiser les compagnies par défaut' })
  seed() { return this.service.seed(); }
}
