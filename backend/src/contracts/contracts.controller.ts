import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un contrat / saisir une production' })
  create(@Body() dto: CreateContractDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  /* Modèle Excel à télécharger */
  @Get('template')
  @ApiOperation({ summary: 'Télécharger le modèle Excel d\'import' })
  downloadTemplate(@Res() res: Response) {
    const buffer = this.service.generateImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="modele_import_production.xlsx"');
    res.send(buffer);
  }

  /* Import Excel */
  @Post('import')
  @ApiOperation({ summary: 'Importer des productions depuis un fichier Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new Error('Aucun fichier reçu');
    return this.service.importFromExcel(file.buffer, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des productions' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('search') search?: string, @Query('status') status?: string,
    @Query('type') type?: string, @Query('companyId') companyId?: string,
    @Query('companyCode') companyCode?: string,
    @Query('clientId') clientId?: string, @Query('expiringIn') expiringIn?: number,
    @Query('mois') mois?: string,
  ) {
    return this.service.findAll({ page, limit, search, status, type, companyId, companyCode, clientId, expiringIn, mois });
  }

  @Get('credits')
  @ApiOperation({ summary: 'Clients avec un reste dû, par compagnie' })
  getCredits(@Query('companyCode') companyCode?: string) {
    return this.service.getCredits(companyCode);
  }

  @Get('provisoires')
  @ApiOperation({ summary: 'Attestations provisoires en attente de la définitive' })
  getProvisoires(@Query('companyCode') companyCode?: string) {
    return this.service.getProvisoires(companyCode);
  }

  @Get('excel')
  @ApiOperation({ summary: 'Télécharger la production (filtrée) en Excel' })
  async downloadExcel(
    @Query('search') search?: string, @Query('status') status?: string,
    @Query('type') type?: string, @Query('companyCode') companyCode?: string,
    @Query('mois') mois?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.service.generateProductionExcel({ search, status, type, companyCode, mois });
    const suffix = mois ? `-${mois}` : '';
    res!.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res!.setHeader('Content-Disposition', `attachment; filename="production${suffix}.xlsx"`);
    res!.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un contrat' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un contrat' })
  update(@Param('id') id: string, @Body() dto: UpdateContractDto, @CurrentUser('id') userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler un contrat' })
  cancel(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser('id') userId: string) {
    return this.service.cancel(id, reason, userId);
  }

  @Patch(':id/definitive')
  @ApiOperation({ summary: "Remettre l'attestation définitive (échéance et prime complètes)" })
  remettreDefinitive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remettreDefinitive(id, userId);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renouveler un contrat' })
  renew(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.renew(id, userId);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Supprimer plusieurs contrats' })
  bulkDelete(@Body('ids') ids: string[]) { return this.service.bulkDelete(ids); }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un contrat' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
