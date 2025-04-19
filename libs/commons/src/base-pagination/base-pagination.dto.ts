import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class BasePaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    default: 0,
  })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    default: 10,
  })
  pageSize?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    default: '',
  })
  fullSearch?: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  filter?: string;

  @ApiProperty({
    required: false,
    type: String,
    description:
      'using comma (,) for separator and add prefix (+) for ASC, (-) for DESC, example: +name,-status',
  })
  @IsOptional()
  sort?: string;
}
