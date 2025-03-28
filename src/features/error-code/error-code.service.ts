import { Injectable } from '@nestjs/common';
import { ErrorCodeRepository } from './repositories/error-code.repository';
import { ErrorCodeEntity } from './entities/error-code.entity';
import { CreateErrorDto } from './dto/create-error-code.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface ErrorCodeResponse {
  success: boolean;
  message: string;
  data: ErrorCodeEntity | null;
}

@Injectable()
export class ErrorCodeService {
  constructor(
    @InjectRepository(ErrorCodeEntity)
    private readonly errorCodeRepository: Repository<ErrorCodeEntity>,
    // private readonly errorCodeRepository: ErrorCodeRepository,
  ) {}

  // async create(createErrorCodeDto: CreateErrorDto): Promise<ErrorCodeResponse> {
  async create(createErrorCodeDto: CreateErrorDto) {
    return createErrorCodeDto;
    //   return this.errorCodeRepository
    //     .create(createErrorCodeDto)
    //     .then((res) => ({
    //       success: true,
    //       message: 'data created',
    //       data: res,
    //     }))
    //     .catch((err) => ({
    //       success: false,
    //       message: err,
    //       data: null,
    //     }));
  }

  // async getMessageByCode(code: string): Promise<ErrorCodeResponse> {
  //   return await this.errorCodeRepository
  //     .findByCode(code)
  //     .then((res) => ({
  //       success: true,
  //       message: 'data found',
  //       data: res,
  //     }))
  //     .catch((err) => ({
  //       success: false,
  //       message: err,
  //       data: null,
  //     }));
  // }
}
