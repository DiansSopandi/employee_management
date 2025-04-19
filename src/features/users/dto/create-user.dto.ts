import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ROLES } from '@app/commons/constants/enums';
import { IsStrongPassword } from 'src/utils/decorators/password.decorator';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsStrongPassword({
    message:
      'Password must contain an uppercase letter, a lowercase letter, a number, and a special character.',
  })
  password: string;

  @ApiPropertyOptional({ enum: ROLES, isArray: true, default: [ROLES.USER] })
  @IsEnum(ROLES, {
    each: true,
    message: `Roles must be one of the following: ${Object.values(ROLES).join(
      ', ',
    )}`,
  })
  @IsOptional()
  @IsArray()
  roles: ROLES[] = [ROLES.USER];
}
