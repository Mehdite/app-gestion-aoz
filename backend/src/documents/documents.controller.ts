import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Téléverser un document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('clientId') clientId?: string,
    @Body('contractId') contractId?: string,
    @Body('quoteId') quoteId?: string,
    @Body('claimId') claimId?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.upload(file, type, userId!, { clientId, contractId, quoteId, claimId });
  }

  @Get()
  @ApiOperation({ summary: 'Liste des documents' })
  findAll(
    @Query('clientId') clientId?: string,
    @Query('contractId') contractId?: string,
    @Query('claimId') claimId?: string,
    @Query('type') type?: string,
  ) {
    return this.service.findAll({ clientId, contractId, claimId, type });
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Obtenir l\'URL de téléchargement' })
  getDownloadUrl(@Param('id') id: string) {
    return this.service.getDownloadUrl(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un document' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
