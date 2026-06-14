import { PartialType } from '@nestjs/mapped-types';
import { CreateClaimDto } from './create-claim.dto';
import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClaimDto extends PartialType(CreateClaimDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expertName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expertiseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  indemnityAmount?: number;
}
