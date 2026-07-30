import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('api/v1/approvals')
export class ApprovalsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('queue')
  async getApprovalQueue() {
    const queue = await this.prisma.expense.findMany({
      where: {
        status: { in: ['SUBMITTED', 'PENDING_MANAGER', 'PENDING_FINANCE'] }
      },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      pendingCount: queue.length,
      queue
    };
  }

  @Post(':id/approve')
  async approveExpense(@Param('id') id: string, @Body() body: { comment?: string }) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    let nextStatus = 'APPROVED';
    if (expense.status === 'SUBMITTED') {
      nextStatus = 'PENDING_FINANCE';
    } else if (expense.status === 'PENDING_MANAGER') {
      nextStatus = 'PENDING_FINANCE';
    } else if (expense.status === 'PENDING_FINANCE') {
      nextStatus = 'APPROVED';
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: nextStatus as any
      }
    });

    await this.prisma.expenseApproval.create({
      data: {
        expenseId: id,
        approverId: 'admin_1', // Seed Finance Admin ID
        status: nextStatus as any,
        comment: body.comment || 'Approved'
      }
    });

    return {
      message: `Expense claim ${id} updated to ${nextStatus}`,
      expense: updated
    };
  }

  @Post(':id/return')
  async returnExpense(@Param('id') id: string, @Body() body: { comment: string }) {
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'RETURNED'
      }
    });

    await this.prisma.expenseApproval.create({
      data: {
        expenseId: id,
        approverId: 'admin_1',
        status: 'RETURNED',
        comment: body.comment
      }
    });

    return {
      message: `Expense ${id} returned to employee with feedback note`,
      expense: updated
    };
  }

  @Post(':id/reject')
  async rejectExpense(@Param('id') id: string, @Body() body: { comment?: string }) {
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'REJECTED'
      }
    });

    await this.prisma.expenseApproval.create({
      data: {
        expenseId: id,
        approverId: 'admin_1',
        status: 'REJECTED',
        comment: body.comment || 'Rejected'
      }
    });

    return {
      message: `Expense claim ${id} rejected`,
      expense: updated
    };
  }
}
