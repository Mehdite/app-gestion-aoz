import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

    const clientNumber = await this.generateClientNumber();
    return this.prisma.client.create({ data: { ...dto, clientNumber } });
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

  private async generateClientNumber(): Promise<string> {
    const count = await this.prisma.client.count();
    return `AOZ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
}
