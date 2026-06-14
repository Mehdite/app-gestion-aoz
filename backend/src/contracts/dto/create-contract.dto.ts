import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INSURANCE_TYPES = ['AUTO','MOTO','HOME','HEALTH','PROFESSIONAL','DECENNIAL','TRANSPORT','LIFE','OTHER'];
const FREQUENCIES     = ['MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL'];

export class CreateContractDto {
  @ApiProperty() @IsString() @IsIn(INSURANCE_TYPES) type: string;
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
  @ApiProperty() @IsDateString() effectiveDate: string;
  @ApiProperty() @IsDateString() expiryDate: string;
  @ApiPropertyOptional() @IsOptional() details?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
}
