import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProspectsModule } from './prospects/prospects.module';
import { QuotesModule } from './quotes/quotes.module';
import { ContractsModule } from './contracts/contracts.module';
import { ClaimsModule } from './claims/claims.module';
import { CompaniesModule } from './companies/companies.module';
import { CommissionsModule } from './commissions/commissions.module';
import { AccountingModule } from './accounting/accounting.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { PaymentsModule } from './payments/payments.module';
import { RenewalsModule } from './renewals/renewals.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { QuittancesModule } from './quittances/quittances.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProspectsModule,
    QuotesModule,
    ContractsModule,
    ClaimsModule,
    CompaniesModule,
    CommissionsModule,
    AccountingModule,
    DocumentsModule,
    NotificationsModule,
    ReportsModule,
    PaymentsModule,
    RenewalsModule,
    DashboardModule,
    QuittancesModule,
  ],
})
export class AppModule {}
