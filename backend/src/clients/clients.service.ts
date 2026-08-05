import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClientDto, createdBy: string) {
    if (dto.cin) {
      const existing = await this.prisma.client.findUnique({ where: { cin: dto.cin } });
      if (existing) throw new ConflictException('Un client avec ce CIN existe déjà');
    }
    if (dto.ice) {
      const existing = await this.prisma.client.findUnique({ where: { ice: dto.ice } });
      if (existing) throw new ConflictException('Un client avec cet ICE existe déjà');
    }

    /* Deux saisies simultanées peuvent viser le même numéro : on retente
       plutôt que de renvoyer une erreur incompréhensible à l'agent. */
    for (let tentative = 0; tentative < 5; tentative++) {
      try {
        const clientNumber = await this.generateClientNumber();
        return await this.prisma.client.create({ data: { ...dto, clientNumber } });
      } catch (err: any) {
        const collisionNumero =
          err?.code === 'P2002' && String(err?.meta?.target ?? '').includes('clientNumber');
        if (collisionNumero) continue;
        const detail = err?.meta?.cause ?? err?.message ?? 'erreur inconnue';
        throw new BadRequestException(`Impossible de créer le client : ${detail}`);
      }
    }
    throw new ConflictException(
      "Impossible d'attribuer un numéro de client — réessayez dans un instant",
    );
  }

  async findAll(params: {
    page?: number; limit?: number; search?: string;
    type?: string; status?: string; city?: string;
  }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { search, type, status, city } = params;

    const where: any = {};
    if (status) where.status = status;
    if (type)   where.type = type;
    if (city)   where.city = { contains: city };

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { companyName: { contains: search } },
        { cin: { contains: search } },
        { ice: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { clientNumber: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { contracts: true, claims: true } } },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contracts: { include: { company: true, product: true }, orderBy: { createdAt: 'desc' } },
        claims: { orderBy: { createdAt: 'desc' }, take: 5 },
        documents: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { contracts: true, claims: true, documents: true } },
      },
    });
    if (!client) throw new NotFoundException('Client non trouvé');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.client.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  }

  async getStats(id: string) {
    await this.findOne(id);
    const [totalContracts, activeContracts, totalClaims, totalPaid] = await Promise.all([
      this.prisma.contract.count({ where: { clientId: id } }),
      this.prisma.contract.count({ where: { clientId: id, status: 'ACTIVE' } }),
      this.prisma.claim.count({ where: { clientId: id } }),
      this.prisma.payment.aggregate({ where: { clientId: id, status: 'PAID' }, _sum: { amount: true } }),
    ]);
    return { totalContracts, activeContracts, totalClaims, totalPaid: totalPaid._sum.amount ?? 0 };
  }

  private async deleteClientRecords(clientIds: string[]) {
    if (clientIds.length === 0) return;

    const contracts = await this.prisma.contract.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
    const contractIds = contracts.map(c => c.id);

    const quotes = await this.prisma.quote.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
    const quoteIds = quotes.map(q => q.id);

    const claims = await this.prisma.claim.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
    const claimIds = claims.map(c => c.id);

    /* Documents — toutes les FK possibles */
    const docOr: any[] = [{ clientId: { in: clientIds } }];
    if (contractIds.length > 0) docOr.push({ contractId: { in: contractIds } });
    if (quoteIds.length > 0)    docOr.push({ quoteId:    { in: quoteIds    } });
    if (claimIds.length > 0)    docOr.push({ claimId:    { in: claimIds    } });
    await this.prisma.document.deleteMany({ where: { OR: docOr } });

    await this.prisma.claim.deleteMany({ where: { clientId: { in: clientIds } } });

    if (contractIds.length > 0) {
      await this.prisma.renewalAlert.deleteMany({ where: { contractId: { in: contractIds } } });
      await this.prisma.contractHistory.deleteMany({ where: { contractId: { in: contractIds } } });
      await this.prisma.commission.deleteMany({ where: { contractId: { in: contractIds } } });
      await this.prisma.payment.deleteMany({ where: { contractId: { in: contractIds } } });
      await this.prisma.contract.deleteMany({ where: { clientId: { in: clientIds } } });
    }

    if (quoteIds.length > 0) {
      await this.prisma.quote.deleteMany({ where: { clientId: { in: clientIds } } });
    }

    await this.prisma.payment.deleteMany({ where: { clientId: { in: clientIds } } });
    await this.prisma.notification.deleteMany({ where: { clientId: { in: clientIds } } });
  }

  async remove(id: string) {
    await this.deleteClientRecords([id]);
    return this.prisma.client.delete({ where: { id } });
  }

  async bulkDelete(ids: string[]) {
    await this.deleteClientRecords(ids);
    const result = await this.prisma.client.deleteMany({ where: { id: { in: ids } } });
    return { deleted: result.count };
  }

  /** Numérote à partir du DERNIER numéro attribué, pas du nombre de clients :
   *  un client supprimé creuse un trou, et un compteur basé sur le total
   *  regénérerait alors un numéro déjà pris. */
  private async generateClientNumber(): Promise<string> {
    const prefixe = `AOZ-${new Date().getFullYear()}-`;
    const dernier = await this.prisma.client.findFirst({
      where: { clientNumber: { startsWith: prefixe } },
      orderBy: { clientNumber: 'desc' },
      select: { clientNumber: true },
    });
    const rang = dernier ? Number(dernier.clientNumber.slice(prefixe.length)) || 0 : 0;
    return `${prefixe}${String(rang + 1).padStart(5, '0')}`;
  }
}
