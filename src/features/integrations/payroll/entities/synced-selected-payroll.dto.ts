import { IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SyncSelectedPayrollDto {
  @ApiProperty({ type: [Number], description: 'Array of employee IDs' })
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  employeeIds: number[];
}
