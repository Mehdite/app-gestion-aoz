import { Controller, Get, Post, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CaisseService } from './caisse.service';
import { CloturerCaisseDto } from './dto/cloturer-caisse.dto';
import { DepenseCaisseDto } from './dto/depense-caisse.dto';

@ApiTags('caisse')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('caisse')
export class CaisseController {
  constructor(private readonly service: CaisseService) {}

  @Get()
  @ApiOperation({ summary: "Journée de caisse : mouvements, totaux, clôture éventuelle" })
  getJournee(@Query('date') date?: string) {
    return this.service.getJournee(date);
  }

  @Post('cloture')
  @ApiOperation({ summary: 'Clôturer la journée avec les espèces comptées' })
  cloturer(@Body() dto: CloturerCaisseDto, @CurrentUser('id') userId: string) {
    return this.service.cloturer(dto, userId);
  }

  @Post('depense')
  @ApiOperation({ summary: 'Dépense payée depuis le tiroir-caisse' })
  ajouterDepense(@Body() dto: DepenseCaisseDto, @CurrentUser('id') userId: string) {
    return this.service.ajouterDepense(dto, userId);
  }

  @Delete('depense/:id')
  @ApiOperation({ summary: 'Supprimer une dépense manuelle (les mouvements automatiques sont protégés)' })
  supprimerDepense(@Param('id') id: string) {
    return this.service.supprimerDepense(id);
  }

  @Get('pdf')
  @ApiOperation({ summary: "Arrêté de caisse à imprimer et signer (PDF)" })
  async pdf(@Query('date') date: string | undefined, @Res() res: Response) {
    const buffer = await this.service.genererArretePdf(date);
    const jour = date || new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="arrete-caisse-${jour}.pdf"`);
    res.send(buffer);
  }
}
