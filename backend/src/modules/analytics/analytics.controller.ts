import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dynamic role-scoped analytics overview:
   * - EMPLOYEE: strictly computes totals from their own submitted/approved claims
   * - ADMIN / SUPER_ADMIN: computes company-wide spend, pending queues, and category breakdown
   */
  @Get('overview')
  async getOverview(@Req() req: any) {
    const user = req.user;
    const isPrivileged = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

    // 1. Fetch expenses scoped to the user
    const expenses = await this.prisma.expense.findMany({
      where: isPrivileged ? {} : { employeeId: user.id },
      select: {
        id: true,
        amount: true,
        category: true,
        status: true,
        date: true,
      },
    });

    // 2. Compute dynamic metrics
    let totalClaimed = 0;
    let totalApproved = 0;
    let totalPending = 0;
    const categoryTotals: Record<string, number> = {};

    for (const exp of expenses) {
      totalClaimed += exp.amount;
      if (exp.status === 'APPROVED' || exp.status === 'REIMBURSED') {
        totalApproved += exp.amount;
      } else if (exp.status === 'SUBMITTED' || exp.status === 'PENDING_MANAGER' || exp.status === 'PENDING_FINANCE') {
        totalPending += exp.amount;
      }

      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }

    // 3. Department Budget calculation
    const defaultBudget = 25000.0;
    const budgetRemaining = Math.max(0, defaultBudget - totalApproved);

    return {
      scope: isPrivileged ? 'ORGANIZATION' : 'INDIVIDUAL',
      totalClaimed: parseFloat(totalClaimed.toFixed(2)),
      totalApproved: parseFloat(totalApproved.toFixed(2)),
      totalPending: parseFloat(totalPending.toFixed(2)),
      monthlySpent: parseFloat(totalApproved.toFixed(2)),
      budgetRemaining: parseFloat(budgetRemaining.toFixed(2)),
      expenseCount: expenses.length,
      categoryBreakdown: categoryTotals,
      activePolicyViolations: 0,
    };
  }
}
