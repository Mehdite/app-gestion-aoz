import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';

@Injectable()
export class ClaimsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClaimDto, agentId: string) {
    const claimNumber = await this.generateClaimNumber();
    return this.prisma.claim.create({
      data: { ...dto, claimNumber, agentId },
      include: { client: true, contract: { include: { company: true } } },
    });
  }

  async findAll(params: {
    page?: number; limit?: number; search?: string;
    status?: string; clientId?: string; contractId?: string;
  }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { search, status, clientId, contractId } = params;

    const where: any = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (contractId) where.contractId = contractId;

    if (search) {
      where.OR = [
        { claimNumber: { contains: search } },
        { description: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.claim.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true } },
          contract: { include: { company: { select: { id: true, name: true } } } },
          agent: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { documents: true } },
        },
      }),
      this.prisma.claim.count({ where }),
    ]);

    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async findOne(id: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id },
      include: {
        client: true,
        contract: { include: { company: true, product: true } },
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
        documents: true,
      },
    });
    if (!claim) throw new NotFoundException('Sinistre non trouvé');
    return claim;
  }

  async update(id: string, dto: UpdateClaimDto) {
    await this.findOne(id);
    return this.prisma.claim.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: string, notes?: string) {
    await this.findOne(id);
    const data: any = { status };
    if (status === 'CLOSED') data.closedAt = new Date();
    if (notes) data.notes = notes;
    return this.prisma.claim.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.claim.delete({ where: { id } });
  }

  private async generateClaimNumber(): Promise<string> {
    const count = await this.prisma.claim.count();
    const year = new Date().getFullYear();
    return `SIN-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
