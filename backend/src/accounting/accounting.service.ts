import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async createEntry(data: any, createdBy: string) {
    return this.prisma.accountingEntry.create({ data: { ...data, createdBy } });
  }

  async findAll(params: { page?: number; limit?: number; type?: string; startDate?: string; endDate?: string }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { type, startDate, endDate } = params;
    const where: any = {};
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [data, total, totals] = await Promise.all([
      this.prisma.accountingEntry.findMany({ where, skip, take, orderBy: { date: 'desc' } }),
      this.prisma.accountingEntry.count({ where }),
      this.prisma.accountingEntry.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const income = totals.find((t) => t.type === 'INCOME')?._sum.amount ?? 0;
    const expense = totals.find((t) => t.type === 'EXPENSE')?._sum.amount ?? 0;

    return {
      data,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
      balance: { income: Number(income), expense: Number(expense), net: Number(income) - Number(expense) },
    };
  }

  async getSituation(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return this.prisma.accountingEntry.groupBy({
      by: ['type', 'category'],
      where,
      _sum: { amount: true },
      orderBy: [{ type: 'asc' }],
    });
  }
}
