import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepenseCaisseDto {
  @ApiProperty() @IsString() @MinLength(2, { message: 'Libellé requis' })
  libelle: string;

  @ApiProperty() @IsNumber() @IsPositive()
  montant: number;
}
