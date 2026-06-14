import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { clientId: string; contractId: string; amount: number; method: string; dueDate: string }) {
    const reference = `PAY-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    return this.prisma.payment.create({
      data: { ...data, reference, dueDate: new Date(data.dueDate) },
    });
  }

  async findAll(params: { page?: number; limit?: number; clientId?: string; contractId?: string; status?: string }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { clientId, contractId, status } = params;
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (contractId) where.contractId = contractId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { firstName: true, lastName: true, companyName: true } },
          contract: { select: { contractNumber: true, type: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async markPaid(id: string, method?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement non trouvé');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), method: method ?? payment.method },
    });

    await this.prisma.accountingEntry.create({
      data: {
        type: 'INCOME',
        category: 'Prime',
        description: `Paiement contrat — Réf. ${payment.reference}`,
        amount: payment.amount,
        date: new Date(),
        reference: payment.reference,
        clientId: payment.clientId,
        contractId: payment.contractId,
        paymentId: id,
        createdBy: 'system',
      },
    });

    return updated;
  }

  async getOverdue() {
    return this.prisma.payment.findMany({
      where: { status: 'PENDING', dueDate: { lt: new Date() } },
      include: { client: true, contract: { select: { contractNumber: true } } },
    });
  }
}
