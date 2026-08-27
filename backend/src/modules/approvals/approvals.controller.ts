import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/approvals')
export class ApprovalsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('queue')
  async getApprovalQueue() {
    const queue = await this.prisma.expense.findMany({
      where: {
        status: { in: ['SUBMITTED', 'PENDING_MANAGER', 'PENDING_FINANCE'] },
      },
      include: {
        items: true,
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      pendingCount: queue.length,
      queue,
    };
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  async approveExpense(@Param('id') id: string, @Body() body: { comment?: string }, @Req() req: any) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    let nextStatus = 'APPROVED';
    if (expense?.status === 'SUBMITTED') {
      nextStatus = 'PENDING_FINANCE';
    } else if (expense?.status === 'PENDING_MANAGER') {
      nextStatus = 'PENDING_FINANCE';
    } else if (expense?.status === 'PENDING_FINANCE') {
      nextStatus = 'APPROVED';
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: nextStatus as any,
      },
    });

    const approverId = req?.user?.id || 'admin_1';

    await this.prisma.expenseApproval.create({
      data: {
        expenseId: id,
        approverId,
        status: nextStatus as any,
        comment: body.comment || 'Verified & Approved',
      },
    });

    return {
      message: `Expense claim ${id} updated to ${nextStatus}`,
      expense: updated,
    };
  }

  @Post(':id/return')
  @UseGuards(JwtAuthGuard)
  async returnExpense(@Param('id') id: string, @Body() body: { comment: string }, @Req() req: any) {
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'RETURNED',
      },
    });

    const approverId = req?.user?.id || 'admin_1';

    await this.prisma.expenseApproval.create({
      data: {
        expenseId: id,
        approverId,
        status: 'RETURNED',
        comment: body.comment,
      },
    });

    return {
      message: `Expense ${id} returned to employee with feedback note`,
      expense: updated,
    };
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectExpense(@Param('id') id: string, @Body() body: { comment?: string }, @Req() req: any) {
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });

    const approverId = req?.user?.id || 'admin_1';

    await this.prisma.expenseApproval.create({
      data: {
        expenseId: id,
        approverId,
        status: 'REJECTED',
        comment: body.comment || 'Rejected',
      },
    });

    return {
      message: `Expense claim ${id} rejected`,
      expense: updated,
    };
  }
}
