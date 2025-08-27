import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAuthenticateDto {
  @ApiProperty({
    default: 'guardians.asguard@gmail.com',
    description: 'The unique identifier of the user',
    example: 'guardians.asguard@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    default: 'Pass123!@',
    description: 'The password of the user',
    example: 'Pass123!@',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
