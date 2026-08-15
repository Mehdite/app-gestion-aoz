import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean, IsIn, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INSURANCE_TYPES = ['AUTO','MOTO','HOME','HEALTH','PROFESSIONAL','DECENNIAL','TRANSPORT','LIFE','WORK_ACCIDENT','RC_EXPLOITATION','RC_PRO','OTHER','PETIT_TAXI','GRAND_TAXI','TRIPORTEUR','FRONTIERE','VOYAGE','ASSISTANCE','ASSISTANCE_MEDICALE'];
const FREQUENCIES     = ['MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL'];
/** Précisions du type : AUTO -> TOURISME|C1|C2|DIVERS, MOTO -> MOTOCYCLE|AUTRESMOTO */
const SOUS_CATEGORIES = ['TOURISME','C1','C2','DIVERS','MOTOCYCLE','AUTRESMOTO'];

export class CreateContractDto {
  @ApiProperty() @IsString() @IsIn(INSURANCE_TYPES) type: string;
  /* @IsOptional() n'ignore que null/undefined : un formulaire qui envoie une
     chaîne vide (type sans précision) doit la voir traitée comme absente. */
  @ApiPropertyOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional() @IsString() @IsIn(SOUS_CATEGORIES)
  sousCategorie?: string;
  @ApiProperty() @IsString() clientId: string;
  @ApiProperty() @IsString() companyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quoteId?: string;
  @ApiProperty()          @IsNumber() primeTTC: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() primeHT?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() reduction?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() primePaye?: number;
  @ApiProperty() @IsString() @IsIn(FREQUENCIES) frequency: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() souscriptionDate?: string;
  @ApiProperty() @IsDateString() effectiveDate: string;
  @ApiProperty() @IsDateString() expiryDate: string;
  /* Attestation provisoire : expiryDate/primeTTC portent l'échéance courte et
     la prime du 1er mois ; echeanceDefinitive/primeDefinitive la période complète */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() estProvisoire?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() echeanceDefinitive?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() primeDefinitive?: number;
  @ApiPropertyOptional() @IsOptional() details?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
}
