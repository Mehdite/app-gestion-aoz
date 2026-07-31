import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VersementsService } from './versements.service';
import { CreateVersementDto } from './dto/create-versement.dto';

@ApiTags('versements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('versements')
export class VersementsController {
  constructor(private readonly service: VersementsService) {}

  @Post()
  @ApiOperation({ summary: 'Enregistrer un versement bancaire ou un virement reçu' })
  create(@Body() dto: CreateVersementDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Journal banque de l\'année + rapprochement avec les primes encaissées' })
  findAll(@Query('annee') annee?: string, @Query('type') type?: string) {
    return this.service.findAll({ annee, type });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une ligne du journal' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
