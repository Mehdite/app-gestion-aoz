import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloturerCaisseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date au format AAAA-MM-JJ' })
  date?: string;

  @ApiProperty() @IsNumber() @Min(0)
  especesComptees: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}
