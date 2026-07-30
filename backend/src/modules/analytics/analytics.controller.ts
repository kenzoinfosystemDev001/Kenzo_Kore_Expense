import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/analytics')
export class AnalyticsController {
  @Get('overview')
  async getOverview() {
    return {
      monthlySpent: 3450.0,
      budgetRemaining: 15500.0,
      activePolicyViolations: 0,
    };
  }
}
