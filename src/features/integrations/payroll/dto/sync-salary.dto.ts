// dto/sync-salary.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class SyncSalaryDto {
  @ApiProperty()
  @IsNumber()
  employeeId: number;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  period: string; // e.g. '2025-03'
}
