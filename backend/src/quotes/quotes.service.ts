import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuoteDto, agentId: string) {
    const quoteNumber = await this.generateQuoteNumber();
    return this.prisma.quote.create({
      data: { ...dto, quoteNumber, agentId },
      include: { client: true, product: { include: { company: true } } },
    });
  }

  async findAll(params: {
    page?: number; limit?: number; search?: string;
    status?: string; clientId?: string; type?: string;
  }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { search, status, clientId, type } = params;
    const where: any = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { quoteNumber: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, companyName: true, type: true } },
          product: { include: { company: { select: { name: true } } } },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        product: { include: { company: true } },
        agent: true,
        contract: true,
        documents: true,
      },
    });
    if (!quote) throw new NotFoundException('Devis non trouvé');
    return quote;
  }

  async send(id: string) {
    const quote = await this.findOne(id);
    if (quote.status !== 'DRAFT') throw new BadRequestException('Ce devis a déjà été envoyé');
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async convert(id: string, agentId: string) {
    const quote = await this.findOne(id);
    if (quote.status === 'CONVERTED') throw new BadRequestException('Déjà converti');
    await this.prisma.quote.update({ where: { id }, data: { status: 'CONVERTED', convertedAt: new Date() } });
    return quote;
  }

  async reject(id: string) {
    return this.prisma.quote.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  private async generateQuoteNumber(): Promise<string> {
    const count = await this.prisma.quote.count();
    const year = new Date().getFullYear();
    return `DEV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
