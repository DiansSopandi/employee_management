import { PartialType } from '@nestjs/swagger';
import { CreateAuthenticateDto } from './create-auth.dto';

export class UpdateAuthenticateDto extends PartialType(CreateAuthenticateDto) {}
