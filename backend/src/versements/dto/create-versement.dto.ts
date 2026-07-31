import { IsString, IsNumber, IsDateString, IsOptional, IsPositive, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersementDto {
  @ApiProperty() @IsString() @IsIn(['VERSEMENT', 'VIREMENT']) type: string;
  @ApiProperty() @IsNumber() @IsPositive() montant: number;
  @ApiProperty() @IsDateString() date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() banque?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
