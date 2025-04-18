// payroll.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SyncSalaryDto } from './dto/sync-salary.dto';
import axios, { AxiosResponse } from 'axios';
import { PayrollResponse } from './interfaces/payroll-response.interface';
import { catchError, firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { SyncedSalary } from './entities/synced-salary.entity';
import { Repository } from 'typeorm';
import { generateFakeSalaries } from 'src/utils/fake-salary.utils';

@Injectable()
export class PayrollService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(SyncedSalary)
    private readonly salaryRepo: Repository<SyncedSalary>,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(PayrollService.name);
  }

  async syncSalary(dto: SyncSalaryDto): Promise<PayrollResponse> {
    const endpoint = 'https://mock-api.payroll.dev/sync'; // change later

    try {
      const response: AxiosResponse<PayrollResponse> = await firstValueFrom(
        this.httpService.post(endpoint, dto).pipe(
          catchError((error) => {
            throw new Error(`Failed to sync payroll: ${error.message}`);
          }),
        ),
      );

      return response.data;
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  async syncFakePayrollData() {
    const salaries = generateFakeSalaries(20);
    return this.salaryRepo.save(salaries);
  }

  async fetchPayrollData() {
    const { data } = await firstValueFrom(
      this.httpService.get('http://localhost:5001/v1/mock-payroll'),
    );
    return data;
  }

  async syncSelectedSalaries(selectedIds: number[]) {
    try {
      const { data } = await axios.get(
        'http://localhost:5001/v1/mock-fake-payroll?count=50',
        {
          // headers: {
          //   Authorization:
          //     'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEwLCJlbWFpbCI6ImV2ZXJ5b25lQG1haWwuY29tIiwicm9sZSI6WyJVU0VSIiwiQURNSU4iXSwiaWF0IjoxNzQ0MTQyMjgxLCJleHAiOjE3NDQxNjM4ODF9.Ch8ASRhSqlcBHAQVuWuo6eeGMnJ4i_ITdMx1dtYo-NM',
          // },
        },
      );

      const filtered = data.data.filter((item: any) =>
        selectedIds.includes(item.employeeId),
      );

      if (!filtered.length)
        return { success: false, message: 'No data found', data: [] };

      this.salaryRepo.save(filtered);
      return {
        success: true,
        message: 'Data synced successfully',
        data: filtered,
      };
    } catch (error) {
      this.logger.error('Error fetching payroll data:', error);
      return {
        success: false,
        message: 'Failed to fetch payroll data',
        error: error.message,
      };
    }
  }
}
