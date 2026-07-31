import { IsString, IsNumber, IsOptional, IsPositive, IsIn, IsBoolean, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CHARGE_CATEGORIES = ['SALAIRE', 'LOYER', 'FACTURE', 'ACHAT', 'AUTRE'];

export class CreateChargeDto {
  @ApiProperty() @IsString() @Matches(/^\d{4}-\d{2}$/, { message: 'mois doit être au format AAAA-MM' }) mois: string;
  @ApiProperty() @IsString() @IsIn(CHARGE_CATEGORIES) categorie: string;
  @ApiProperty() @IsString() libelle: string;
  @ApiProperty() @IsNumber() @IsPositive() montant: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurrent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateChargeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(CHARGE_CATEGORIES) categorie?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() libelle?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() montant?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurrent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
