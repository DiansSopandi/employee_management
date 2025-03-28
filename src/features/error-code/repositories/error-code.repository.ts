import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCodeEntity } from '../entities/error-code.entity';

@Injectable()
export class ErrorCodeRepository {
  constructor(
    @InjectRepository(ErrorCodeEntity)
    private readonly errorCodeRepository: Repository<ErrorCodeEntity>,
  ) {}

  async create(errorCode: Partial<ErrorCodeEntity>): Promise<ErrorCodeEntity> {
    return await this.errorCodeRepository.save(errorCode);
  }

  async findByCode(code: string): Promise<ErrorCodeEntity | null> {
    return await this.errorCodeRepository.findOne({ where: { code } });
  }
}
