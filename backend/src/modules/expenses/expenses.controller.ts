import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get Expenses scoped strictly to user role:
   * - EMPLOYEE: sees only their own expense claims (NO ACCESS to other employees' claims)
   * - ADMIN / SUPER_ADMIN: sees all enterprise expense claims
   */
  @Get()
  async getExpenses(@Req() req: any) {
    const user = req.user;
    const isPrivileged = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

    return this.prisma.expense.findMany({
      where: isPrivileged ? {} : { employeeId: user.id },
      include: {
        employee: true,
        items: true,
        approvals: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get Single Expense by ID with strict IDOR protection:
   * Employee A cannot view Employee B's expense by altering the ID in the URL.
   */
  @Get(':id')
  async getExpenseById(@Param('id') id: string, @Req() req: any) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        employee: true,
        items: true,
        approvals: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense claim not found');
    }

    if (expense.employeeId !== req.user.id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied: You do not have permission to view another employee expense claim.');
    }

    return expense;
  }

  @Post()
  async createExpense(@Body() body: any, @Req() req: any) {
    const status = body.isDraft ? 'DRAFT' : 'SUBMITTED';
    const user = req.user;

    const newExpense = await this.prisma.expense.create({
      data: {
        title: body.title,
        employeeId: user.id, // Strictly tied to authenticated user
        departmentId: user.departmentId || body.departmentId || 'dept_eng',
        costCenterId: user.costCenterId || body.costCenterId || 'cc_dev',
        category: body.category,
        amount: parseFloat(body.amount),
        currency: body.currency || 'USD',
        date: new Date(body.date),
        paymentMethod: (body.paymentMethod as any) || 'UPI',
        status: status as any,
        merchant: body.merchant,
        businessPurpose: body.businessPurpose || '',
        billable: body.billable || false,
        location: body.location || '',
        receiptUrl: body.receiptUrl || '',
        taxAmount: parseFloat(body.taxAmount) || 0.0,
        referenceNumber: body.referenceNumber || '',
        items: {
          create: body.items?.map((item: any) => ({
            description: item.description || '',
            amount: parseFloat(item.amount) || 0.0,
            taxAmount: parseFloat(item.taxAmount) || 0.0,
            category: item.category || body.category,
          })) || [],
        },
      },
      include: {
        items: true,
        employee: true,
      },
    });

    return {
      message: 'Expense created in database',
      expense: newExpense,
    };
  }

  @Put(':id')
  async updateExpense(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');

    // Strict Ownership & Permission Enforcement
    if (expense.employeeId !== req.user.id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied: You are not authorized to edit another employee expense claim.');
    }

    // Do not allow editing if already approved or reimbursed
    if (expense.status === 'APPROVED' || expense.status === 'REIMBURSED') {
      throw new ForbiddenException('Cannot modify an expense claim that has already been approved or reimbursed.');
    }

    // Drop old items and recreate
    await this.prisma.expenseItem.deleteMany({ where: { expenseId: id } });

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        title: body.title,
        category: body.category,
        amount: parseFloat(body.amount),
        date: new Date(body.date),
        paymentMethod: body.paymentMethod,
        merchant: body.merchant,
        businessPurpose: body.businessPurpose,
        billable: body.billable,
        location: body.location,
        receiptUrl: body.receiptUrl,
        taxAmount: parseFloat(body.taxAmount) || 0.0,
        referenceNumber: body.referenceNumber,
        status: body.status || expense.status,
        items: {
          create: body.items?.map((item: any) => ({
            description: item.description,
            amount: parseFloat(item.amount),
            taxAmount: parseFloat(item.taxAmount),
            category: item.category || body.category,
          })) || [],
        },
      },
      include: {
        items: true,
        employee: true,
      },
    });

    return {
      message: 'Expense updated in database',
      expense: updated,
    };
  }

  @Delete(':id')
  async deleteExpense(@Param('id') id: string, @Req() req: any) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');

    // Strict Ownership & Permission Enforcement
    if (expense.employeeId !== req.user.id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied: You are not authorized to delete another employee expense claim.');
    }

    // Do not allow deleting approved or reimbursed claims
    if (expense.status === 'APPROVED' || expense.status === 'REIMBURSED') {
      throw new ForbiddenException('Cannot delete an expense claim that has already been approved or reimbursed.');
    }

    await this.prisma.expenseItem.deleteMany({ where: { expenseId: id } });
    await this.prisma.expenseApproval.deleteMany({ where: { expenseId: id } });
    await this.prisma.reimbursement.deleteMany({ where: { expenseId: id } });
    await this.prisma.expenseTag.deleteMany({ where: { expenseId: id } });

    await this.prisma.expense.delete({
      where: { id },
    });

    return {
      message: `Expense claim ${id} deleted from database`,
    };
  }
}
