import { Controller, Get, Patch, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Historique des notifications' })
  findAll(
    @Query('page') page?: number, @Query('limit') limit?: number,
    @Query('clientId') clientId?: string, @Query('channel') channel?: string,
  ) {
    return this.service.findAll({ page, limit, clientId, channel });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer comme lu' })
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }
}
