import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique name for the role',
    example: 'ADMIN',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description for the role',
    example: 'Administrator role with full access',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'List of permission IDs associated with this role',
    type: [Number],
    example: [1, 2, 3, 4, 5],
  })
  @IsArray()
  @IsInt({ each: true })
  permissions: number[];

  //   @ApiProperty({
  //     description: 'List of permission UUIDs associated with this role',
  //     type: [String],
  //     example: ['2a5f4fda-6a7b-4f2f-b278-8a5cf36b6cd2'],
  //   })
  //   @IsArray()
  //   @IsUUID('all', {
  //     each: true,
  //     message: 'Each permission must be a valid UUID',
  //   })
  //   permissions: string[];
}
