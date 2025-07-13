import { Action } from '@app/commons';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Resource name the permission applies to',
    example: 'PRODUCTS',
  })
  @IsNotEmpty()
  @IsString()
  resource: string;

  @ApiProperty({
    description: 'Action to be performed on the resource',
    enum: Action,
    example: Action.READ,
  })
  @IsNotEmpty()
  @IsEnum(Action, {
    message: `Action must be one of: ${Object.values(Action).join(', ')}`,
  })
  action: Action;

  //   @ApiProperty({
  //     description: 'List of allowed actions on the resource',
  //     example: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
  //     type: [String],
  //   })
  //   @IsNotEmpty()
  //   @IsArray()
  //   @IsEnum(Action, { each: true })
  //   actions: Action[];
}
