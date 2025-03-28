import { Module } from '@nestjs/common';
import { ErrorCodeService } from './error-code.service';
import { ErrorCodeController } from './error-code.controller';
import { ErrorCodeRepository } from './repositories/error-code.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorCodeEntity } from './entities/error-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ErrorCodeEntity])],
  controllers: [ErrorCodeController],
  providers: [
    ErrorCodeService,
    // {
    //   provide: ErrorCodeRepository,
    //   useClass: ErrorCodeRepository,
    // },
  ],
  // exports: [ErrorCodeService, ErrorCodeRepository],
})
export class ErrorCodeModule {}
