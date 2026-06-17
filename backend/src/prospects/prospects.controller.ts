import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProspectsService } from './prospects.service';

@ApiTags('prospects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('prospects')
export class ProspectsController {
  constructor(private readonly service: ProspectsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un prospect' })
  create(@Body() data: any, @CurrentUser('id') userId: string) { return this.service.create(data, userId); }

  @Get()
  @ApiOperation({ summary: 'Liste des prospects' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('search') search?: string, @Query('status') status?: string,
  ) { return this.service.findAll({ page, limit, search, status }); }

  @Get('pipeline')
  @ApiOperation({ summary: 'Pipeline CRM' })
  getPipeline() { return this.service.getPipeline(); }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un prospect' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un prospect' })
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Changer le statut' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Ajouter une tâche' })
  addTask(@Param('id') id: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.service.addTask(id, data, userId);
  }

  @Post(':id/appointments')
  @ApiOperation({ summary: 'Ajouter un rendez-vous' })
  addAppointment(@Param('id') id: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.service.addAppointment(id, data, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un prospect' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
