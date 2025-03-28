import { Body, Controller, Post } from '@nestjs/common';
import { CreateErrorDto } from './dto/create-error-code.dto';
import InsuranceApi from 'src/utils/decorators/header.decorator';
import { ErrorCodeService } from './error-code.service';

@InsuranceApi('Error Codes')
@Controller('error-code')
export class ErrorCodeController {
  constructor(private readonly errorCodeService: ErrorCodeService) {}

  @Post()
  create(@Body() createErrorCodeDto: CreateErrorDto) {
    return createErrorCodeDto; //this.errorCodeService.create(createErrorCodeDto);
  }
}
