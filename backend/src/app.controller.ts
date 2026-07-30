import { Controller, Get } from '@nestjs/common';

@Controller('api/v1')
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'healthy',
      message: 'Kenzo Kore Expense Management System API is live',
      timestamp: new Date().toISOString()
    };
  }
}
