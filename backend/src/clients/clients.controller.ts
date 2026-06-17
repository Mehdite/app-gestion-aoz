import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un client' })
  create(@Body() dto: CreateClientDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des clients' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('search') search?: string, @Query('type') type?: string,
    @Query('status') status?: string, @Query('city') city?: string,
  ) {
    return this.service.findAll({ page, limit, search, type, status, city });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un client' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Statistiques d\'un client' })
  getStats(@Param('id') id: string) { return this.service.getStats(id); }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un client' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) { return this.service.update(id, dto); }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver un client' })
  archive(@Param('id') id: string) { return this.service.archive(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un client' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
