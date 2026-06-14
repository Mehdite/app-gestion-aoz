import { IsString, IsNumber, IsDateString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuoteDto {
  @ApiProperty({ enum: ['AUTO','HOME','HEALTH','PROFESSIONAL','DECENNIAL','TRANSPORT','LIFE','OTHER'] })
  @IsString()
  @IsIn(['AUTO','HOME','HEALTH','PROFESSIONAL','DECENNIAL','TRANSPORT','LIFE','OTHER'])
  type: string;

  @ApiProperty() @IsString() clientId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsNumber() primeTTC: number;
  @ApiProperty() @IsNumber() primeHT: number;
  @ApiProperty() @IsNumber() taxes: number;
  @ApiProperty() @IsDateString() validUntil: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveDate?: string;
  @ApiPropertyOptional() @IsOptional() details?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
