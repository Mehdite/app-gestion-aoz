import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      totalClients, activeContracts, totalClaims, openClaims,
      monthRevenue, monthCommissions, expiringContracts,
      quotes, convertedQuotes, recentContracts, recentClaims, revenuByMonth,
    ] = await Promise.all([
      this.prisma.client.count({ where: { status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.claim.count(),
      this.prisma.claim.count({ where: { status: { in: ['DECLARED', 'IN_PROGRESS'] } } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` },
        _sum: { netAmount: true },
      }),
      this.prisma.contract.count({
        where: { status: 'ACTIVE', expiryDate: { lte: in30Days, gte: now } },
      }),
      this.prisma.quote.count(),
      this.prisma.quote.count({ where: { status: 'CONVERTED' } }),
      this.prisma.contract.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { firstName: true, lastName: true, companyName: true, type: true } },
          company: { select: { name: true } },
        },
      }),
      this.prisma.claim.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: { client: { select: { firstName: true, lastName: true, companyName: true } } },
      }),
      this.getMonthlyRevenue(),
    ]);

    return {
      kpis: {
        totalClients, activeContracts, totalClaims, openClaims,
        monthRevenue: monthRevenue._sum.amount ?? 0,
        monthCommissions: monthCommissions._sum.netAmount ?? 0,
        expiringContracts,
        conversionRate: quotes > 0 ? Math.round((convertedQuotes / quotes) * 100) : 0,
      },
      recentContracts, recentClaims, revenuByMonth,
    };
  }

  async getExpiringContracts(days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.contract.findMany({
      where: { status: 'ACTIVE', expiryDate: { lte: future, gte: new Date() } },
      orderBy: { expiryDate: 'asc' },
      include: {
        client: { select: { firstName: true, lastName: true, companyName: true, phone: true, email: true } },
        company: { select: { name: true } },
        product: { select: { name: true } },
      },
    });
  }

  private async getMonthlyRevenue() {
    const months: { month: string; revenue: number; commissions: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      const [rev, comm] = await Promise.all([
        this.prisma.payment.aggregate({
          where: { status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.commission.aggregate({
          where: { period: `${year}-${String(month).padStart(2, '0')}` },
          _sum: { netAmount: true },
        }),
      ]);

      months.push({
        month: `${year}-${String(month).padStart(2, '0')}`,
        revenue: Number(rev._sum.amount ?? 0),
        commissions: Number(comm._sum.netAmount ?? 0),
      });
    }

    return months;
  }
}
