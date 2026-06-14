import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        products: { where: { isActive: true } },
        _count: { select: { contracts: true, commissions: true } },
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        products: true,
        _count: { select: { contracts: true } },
      },
    });
    if (!company) throw new NotFoundException('Compagnie non trouvée');
    return company;
  }

  async create(data: any) {
    return this.prisma.company.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data });
  }

  async addProduct(companyId: string, data: any) {
    await this.findOne(companyId);
    return this.prisma.companyProduct.create({ data: { ...data, companyId } });
  }

  async getStats(id: string) {
    const [totalContracts, activeContracts, totalCommissions] = await Promise.all([
      this.prisma.contract.count({ where: { companyId: id } }),
      this.prisma.contract.count({ where: { companyId: id, status: 'ACTIVE' } }),
      this.prisma.commission.aggregate({
        where: { companyId: id },
        _sum: { netAmount: true },
      }),
    ]);
    return { totalContracts, activeContracts, totalCommissions: totalCommissions._sum.netAmount ?? 0 };
  }

  async seed() {
    const companies = [
      { name: 'AXA Assurance Maroc', code: 'AXA', email: 'contact@axa.ma', phone: '0522000000' },
      { name: 'Sanlam Maroc', code: 'SAM', email: 'contact@sanlam.ma', phone: '0522000001' },
      { name: 'Wafa Assurance', code: 'WAF', email: 'contact@wafa.ma', phone: '0522000002' },
      { name: 'RMA Assurance', code: 'RMA', email: 'contact@rma.ma', phone: '0522000003' },
      { name: 'AtlantaSanad', code: 'ATL', email: 'contact@atlanta.ma', phone: '0522000004' },
      { name: 'Allianz Maroc', code: 'ALZ', email: 'contact@allianz.ma', phone: '0522000005' },
    ];

    for (const company of companies) {
      await this.prisma.company.upsert({
        where: { code: company.code },
        update: {},
        create: company,
      });
    }

    return { message: 'Compagnies initialisées' };
  }
}
