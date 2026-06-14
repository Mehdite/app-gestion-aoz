import {
  Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';

@ApiTags('claims')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  @Post()
  @ApiOperation({ summary: 'Déclarer un sinistre' })
  create(@Body() dto: CreateClaimDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des sinistres' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('contractId') contractId?: string,
  ) {
    return this.service.findAll({ page, limit, search, status, clientId, contractId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un sinistre' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un sinistre' })
  update(@Param('id') id: string, @Body() dto: UpdateClaimDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Changer le statut d\'un sinistre' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.service.updateStatus(id, status, notes);
  }
}
