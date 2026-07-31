import { IsString, IsNumber, IsDateString, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRistourneDto {
  @ApiProperty() @IsString() contractId: string;
  @ApiProperty() @IsNumber() @IsPositive() montant: number;
  @ApiProperty() @IsDateString() dateEffet: string;
  @ApiPropertyOptional() @IsOptional() @IsString() motif?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
