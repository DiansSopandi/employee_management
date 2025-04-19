import { IntersectionType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { BasePaginationDto } from '@app/commons/base-pagination/base-pagination.dto';

export class FilterUserDto extends IntersectionType(
  PartialType(CreateUserDto),
  BasePaginationDto,
) {}
