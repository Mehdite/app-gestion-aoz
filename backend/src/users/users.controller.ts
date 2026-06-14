import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer un utilisateur' })
  create(@Body() data: any) { return this.service.create(data); }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Liste des utilisateurs' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Détails d\'un utilisateur' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Patch(':id/toggle')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activer/Désactiver un utilisateur' })
  toggle(@Param('id') id: string) { return this.service.toggleActive(id); }
}
