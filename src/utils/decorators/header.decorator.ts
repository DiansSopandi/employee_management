import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

export default function EmployeeApi(...apiTag: string[]) {
  return applyDecorators(
    // ApiHeader({
    //   name: 'X-CSRF-TOKEN',
    //   description: 'Put CSRF token here',
    // }),
    ApiTags(...apiTag),
  );
}
