import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';

const PROSPECT_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

@Injectable()
export class ProspectsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, agentId: string) {
    return this.prisma.prospect.create({ data: { ...data, agentId } });
  }

  async findAll(params: { page?: number; limit?: number; search?: string; status?: string; agentId?: string }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { search, status, agentId } = params;
    const where: any = {};
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.prospect.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { firstName: true, lastName: true } },
          _count: { select: { tasks: true, appointments: true } },
        },
      }),
      this.prisma.prospect.count({ where }),
    ]);

    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async findOne(id: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id },
      include: { agent: true, tasks: { orderBy: { createdAt: 'desc' } }, appointments: { orderBy: { startAt: 'desc' } } },
    });
    if (!prospect) throw new NotFoundException('Prospect non trouvé');
    return prospect;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.prospect.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.prospect.update({
      where: { id },
      data: { status, ...(status === 'WON' ? { convertedAt: new Date() } : {}) },
    });
  }

  async getPipeline() {
    const pipeline = await Promise.all(
      PROSPECT_STATUSES.map(async (status) => {
        const count = await this.prisma.prospect.count({ where: { status } });
        return { status, count };
      }),
    );
    return pipeline;
  }

  async addTask(prospectId: string, data: any, userId: string) {
    return this.prisma.task.create({ data: { ...data, prospectId, assignedTo: userId } });
  }

  async addAppointment(prospectId: string, data: any, userId: string) {
    return this.prisma.appointment.create({ data: { ...data, prospectId, createdBy: userId } });
  }
}
