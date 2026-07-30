import { Controller, Post, Get, Param, Delete } from '@nestjs/common';

@Controller('api/v1/receipts')
export class ReceiptsController {
  @Post('upload')
  async uploadReceipt() {
    return {
      message: 'Receipt uploaded to S3 successfully',
      fileUrl: 's3://receipt-vault/demo-file.pdf',
    };
  }

  @Get()
  async getReceipts() {
    return {
      receipts: [],
    };
  }
}
