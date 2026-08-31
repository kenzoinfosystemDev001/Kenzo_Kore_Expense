import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
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
  async approveExpense(@Param('id') id: string, @Body() body: { comment?: string }, @Req() req: any) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense claim not found');

    // Prevent Self-Approval (Segregation of Duties)
    if (expense.employeeId === req.user.id) {
      throw new ForbiddenException('Segregation of duties violation: you cannot approve your own expense claim.');
    }

    let nextStatus = 'APPROVED';
    if (expense.status === 'SUBMITTED' || expense.status === 'PENDING_MANAGER') {
      nextStatus = 'PENDING_FINANCE';
    } else if (expense.status === 'PENDING_FINANCE') {
      nextStatus = 'APPROVED';
    }

    const approverId = req.user.id;

    // Atomic Transaction: Update Expense and create ExpenseApproval record together
    const [updated, approvalRecord] = await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id },
        data: { status: nextStatus as any },
      }),
      this.prisma.expenseApproval.create({
        data: {
          expenseId: id,
          approverId,
          status: nextStatus as any,
          comment: body.comment || 'Verified & Approved',
        },
      }),
    ]);

    return {
      message: `Expense claim ${id} updated to ${nextStatus}`,
      expense: updated,
      approval: approvalRecord,
    };
  }

  @Post(':id/return')
  async returnExpense(@Param('id') id: string, @Body() body: { comment: string }, @Req() req: any) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense claim not found');

    const approverId = req.user.id;

    const [updated, approvalRecord] = await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id },
        data: { status: 'RETURNED' },
      }),
      this.prisma.expenseApproval.create({
        data: {
          expenseId: id,
          approverId,
          status: 'RETURNED',
          comment: body.comment || 'Returned for revision',
        },
      }),
    ]);

    return {
      message: `Expense ${id} returned to employee with feedback note`,
      expense: updated,
      approval: approvalRecord,
    };
  }

  @Post(':id/reject')
  async rejectExpense(@Param('id') id: string, @Body() body: { comment?: string }, @Req() req: any) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense claim not found');

    const approverId = req.user.id;

    const [updated, approvalRecord] = await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id },
        data: { status: 'REJECTED' },
      }),
      this.prisma.expenseApproval.create({
        data: {
          expenseId: id,
          approverId,
          status: 'REJECTED',
          comment: body.comment || 'Rejected',
        },
      }),
    ]);

    return {
      message: `Expense claim ${id} rejected`,
      expense: updated,
      approval: approvalRecord,
    };
  }
}
