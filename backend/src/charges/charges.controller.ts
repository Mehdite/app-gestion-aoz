import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChargesService } from './charges.service';
import { CreateChargeDto, UpdateChargeDto } from './dto/create-charge.dto';

@ApiTags('charges')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('charges')
export class ChargesController {
  constructor(private readonly service: ChargesService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter une charge' })
  create(@Body() dto: CreateChargeDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Charges du mois + total et répartition par catégorie' })
  findAll(
    @Query('mois') mois?: string,
    @Query('categorie') categorie?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.findAll({ mois, categorie }, userId!);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une charge' })
  update(@Param('id') id: string, @Body() dto: UpdateChargeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une charge' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
