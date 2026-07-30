import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('api/v1/expenses')
export class ExpensesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getExpenses() {
    return this.prisma.expense.findMany({
      include: {
        items: true,
        approvals: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post()
  async createExpense(@Body() body: any) {
    const status = body.isDraft ? 'DRAFT' : 'SUBMITTED';
    
    const newExpense = await this.prisma.expense.create({
      data: {
        title: body.title,
        employeeId: body.employeeId || 'emp_1',
        departmentId: body.departmentId || 'dept_eng',
        costCenterId: body.costCenterId || 'cc_dev',
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
            category: item.category || body.category
          })) || []
        }
      },
      include: {
        items: true
      }
    });

    return {
      message: 'Expense created in Neon database',
      expense: newExpense
    };
  }

  @Put(':id')
  async updateExpense(@Param('id') id: string, @Body() body: any) {
    // Drop old items
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
        status: body.status,
        items: {
          create: body.items?.map((item: any) => ({
            description: item.description,
            amount: parseFloat(item.amount),
            taxAmount: parseFloat(item.taxAmount),
            category: item.category || body.category
          })) || []
        }
      },
      include: {
        items: true
      }
    });

    return {
      message: 'Expense updated in Postgres database',
      expense: updated
    };
  }

  @Delete(':id')
  async deleteExpense(@Param('id') id: string) {
    await this.prisma.expenseItem.deleteMany({ where: { expenseId: id } });
    await this.prisma.expenseApproval.deleteMany({ where: { expenseId: id } });
    await this.prisma.reimbursement.deleteMany({ where: { expenseId: id } });
    await this.prisma.expenseTag.deleteMany({ where: { expenseId: id } });
    
    await this.prisma.expense.delete({
      where: { id }
    });

    return {
      message: `Expense claim ${id} deleted from Neon database`,
    };
  }
}
