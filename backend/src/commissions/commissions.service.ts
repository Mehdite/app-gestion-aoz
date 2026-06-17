import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { page?: number; limit?: number; period?: string; companyId?: string; agentId?: string; isPaid?: boolean }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { period, companyId, agentId, isPaid } = params;

    const where: any = {};
    if (period) where.period = period;
    if (companyId) where.companyId = companyId;
    if (agentId) where.agentId = agentId;
    if (isPaid !== undefined) where.isPaid = isPaid;

    const [data, total, totals] = await Promise.all([
      this.prisma.commission.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          contract: { select: { contractNumber: true, type: true } },
          company: { select: { name: true } },
          agent: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.commission.count({ where }),
      this.prisma.commission.aggregate({ where, _sum: { grossAmount: true, netAmount: true } }),
    ]);

    return {
      data,
      meta: {
        total, page: p, limit: l, totalPages: Math.ceil(total / l),
        summary: { gross: totals._sum.grossAmount ?? 0, net: totals._sum.netAmount ?? 0 },
      },
    };
  }

  async getByPeriod(period: string) {
    return this.prisma.commission.groupBy({
      by: ['companyId'],
      where: { period },
      _sum: { grossAmount: true, netAmount: true },
    });
  }

  async getMonthlyReport(year: number) {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const period = `${year}-${String(m).padStart(2, '0')}`;
      const agg = await this.prisma.commission.aggregate({
        where: { period },
        _sum: { netAmount: true },
        _count: true,
      });
      months.push({ period, net: agg._sum.netAmount ?? 0, count: agg._count });
    }
    return months;
  }

  async remove(id: string) {
    return this.prisma.commission.delete({ where: { id } });
  }

  async markPaid(ids: string[]) {
    await this.prisma.commission.updateMany({
      where: { id: { in: ids } },
      data: { isPaid: true, paidAt: new Date() },
    });
    return { message: `${ids.length} commission(s) marquée(s) comme payée(s)` };
  }
}
