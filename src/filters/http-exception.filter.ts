import { ErrorCodeService } from 'src/features/error-code/error-code.service';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject('winston') private readonly logger: Logger,
    private readonly errorCodeServic: ErrorCodeService,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();

      this.logger.error(
        `Status: ${status}, Message: ${JSON.stringify({ success: false, message: errorResponse })}`,
      );
      response.status(status).json({ success: false, message: errorResponse });
    } else {
      this.logger.error(`Status: 500, Message: Internal Server Error`);
      response.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }
}
