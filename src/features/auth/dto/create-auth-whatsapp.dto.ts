import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAuthWhatsappDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  waId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  uuid: string;
}
