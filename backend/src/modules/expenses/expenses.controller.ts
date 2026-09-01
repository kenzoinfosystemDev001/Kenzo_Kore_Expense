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
   * Get Single Expense by ID with strict IDOR protection
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

    const parsedAmount = isNaN(parseFloat(body.amount)) ? 0.0 : parseFloat(body.amount);
    const parsedTax = isNaN(parseFloat(body.taxAmount)) ? 0.0 : parseFloat(body.taxAmount);
    const referenceNumber =
      body.referenceNumber && body.referenceNumber.trim() !== ''
        ? body.referenceNumber.trim()
        : `EXP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newExpense = await this.prisma.expense.create({
      data: {
        title: body.title,
        employeeId: user.id,
        departmentId: user.departmentId || body.departmentId || 'dept_eng',
        costCenterId: user.costCenterId || body.costCenterId || 'cc_dev',
        category: body.category,
        amount: parsedAmount,
        currency: body.currency || 'USD',
        date: body.date ? new Date(body.date) : new Date(),
        paymentMethod: (body.paymentMethod as any) || 'UPI',
        status: status as any,
        merchant: body.merchant || 'General Merchant',
        businessPurpose: body.businessPurpose || '',
        billable: body.billable || false,
        location: body.location || '',
        receiptUrl: body.receiptUrl || '',
        taxAmount: parsedTax,
        referenceNumber,
        items: {
          create: body.items?.map((item: any) => ({
            description: item.description || '',
            amount: isNaN(parseFloat(item.amount)) ? 0.0 : parseFloat(item.amount),
            taxAmount: isNaN(parseFloat(item.taxAmount)) ? 0.0 : parseFloat(item.taxAmount),
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

    const parsedAmount = isNaN(parseFloat(body.amount)) ? expense.amount : parseFloat(body.amount);
    const parsedTax = isNaN(parseFloat(body.taxAmount)) ? 0.0 : parseFloat(body.taxAmount);

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        title: body.title || expense.title,
        category: body.category || expense.category,
        amount: parsedAmount,
        date: body.date ? new Date(body.date) : expense.date,
        paymentMethod: body.paymentMethod || expense.paymentMethod,
        merchant: body.merchant || expense.merchant,
        businessPurpose: body.businessPurpose !== undefined ? body.businessPurpose : expense.businessPurpose,
        billable: body.billable !== undefined ? body.billable : expense.billable,
        location: body.location || expense.location,
        receiptUrl: body.receiptUrl !== undefined ? body.receiptUrl : expense.receiptUrl,
        taxAmount: parsedTax,
        referenceNumber: body.referenceNumber !== undefined ? body.referenceNumber : expense.referenceNumber,
        status: body.status || expense.status,
        items: {
          create: body.items?.map((item: any) => ({
            description: item.description || '',
            amount: isNaN(parseFloat(item.amount)) ? 0.0 : parseFloat(item.amount),
            taxAmount: isNaN(parseFloat(item.taxAmount)) ? 0.0 : parseFloat(item.taxAmount),
            category: item.category || body.category || expense.category,
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

    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN';

    // Strict Ownership & Permission Enforcement
    if (expense.employeeId !== req.user.id && !isAdmin) {
      throw new ForbiddenException('Access denied: You are not authorized to delete another employee expense claim.');
    }

    // Regular non-admin employees cannot delete approved/reimbursed claims, but Admins have full database control
    if (!isAdmin && (expense.status === 'APPROVED' || expense.status === 'REIMBURSED')) {
      throw new ForbiddenException('Cannot delete an expense claim that has already been approved or reimbursed.');
    }

    // Cascade delete all child associations safely in a transaction
    await this.prisma.$transaction([
      this.prisma.expenseItem.deleteMany({ where: { expenseId: id } }),
      this.prisma.expenseApproval.deleteMany({ where: { expenseId: id } }),
      this.prisma.reimbursement.deleteMany({ where: { expenseId: id } }),
      this.prisma.expenseTag.deleteMany({ where: { expenseId: id } }),
      this.prisma.expense.delete({ where: { id } }),
    ]);

    return {
      message: `Expense claim ${id} successfully deleted from database by ${isAdmin ? 'Administrator' : 'User'}`,
    };
  }
}
