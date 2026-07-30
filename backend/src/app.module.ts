import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ExpensesModule,
    ApprovalsModule,
    ReceiptsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
