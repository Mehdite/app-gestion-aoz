import {
  Controller, Get, Patch, Post, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { QuittancesService } from './quittances.service';

@ApiTags('quittances')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('quittances')
export class QuittancesController {
  constructor(private readonly service: QuittancesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des quittances impayées' })
  findAll(
    @Query('page')       page?:       number,
    @Query('limit')      limit?:      number,
    @Query('search')     search?:     string,
    @Query('status')     status?:     string,
    @Query('moisImport') moisImport?: string,
  ) {
    return this.service.findAll({ page, limit, search, status, moisImport });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques par mois' })
  getStats() {
    return this.service.getStats();
  }

  @Post('import')
  @ApiOperation({ summary: 'Importer un fichier AXA quittances' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('moisImport') moisImport: string,
  ) {
    if (!file) throw new Error('Aucun fichier reçu');
    const periode = moisImport?.trim() || 'INCONNU';
    return this.service.importFromExcel(file.buffer, periode);
  }

  @Patch('reglerTout')
  @ApiOperation({ summary: 'Marquer toutes les quittances comme réglées à AXA' })
  reglerTout() {
    return this.service.reglerTout();
  }

  @Post('alimenter')
  @ApiOperation({ summary: 'Créer clients / contrats / commissions depuis les quittances' })
  alimenter(@CurrentUser('id') agentId: string) {
    return this.service.alimenter(agentId);
  }

  @Patch(':id/encaisser')
  @ApiOperation({ summary: 'Marquer une quittance comme encaissée' })
  encaisser(
    @Param('id')        id:     string,
    @Body('method')     method: string,
  ) {
    return this.service.encaisser(id, method);
  }
}
