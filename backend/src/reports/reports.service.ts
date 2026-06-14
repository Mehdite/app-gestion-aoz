import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getContractsReport(params: { startDate?: string; endDate?: string; companyId?: string; type?: string }) {
    const { startDate, endDate, companyId, type } = params;
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const contracts = await this.prisma.contract.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true, companyName: true, type: true, cin: true, ice: true } },
        company: { select: { name: true } },
        product: { select: { name: true } },
        agent: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totals = await this.prisma.contract.aggregate({ where, _sum: { primeTTC: true, primeHT: true, taxes: true } });

    return {
      data: contracts,
      meta: {
        summary: {
          count: contracts.length,
          totalPrimeTTC: totals._sum.primeTTC ?? 0,
          totalPrimeHT: totals._sum.primeHT ?? 0,
          totalTaxes: totals._sum.taxes ?? 0,
        },
      },
    };
  }

  async getCommissionsReport(params: { year: number; companyId?: string }) {
    const { year, companyId } = params;
    const periods = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

    const results = await Promise.all(
      periods.map(async (period) => {
        const where: any = { period };
        if (companyId) where.companyId = companyId;

        const agg = await this.prisma.commission.aggregate({
          where,
          _sum: { grossAmount: true, netAmount: true },
          _count: true,
        });

        return { period, gross: agg._sum.grossAmount ?? 0, net: agg._sum.netAmount ?? 0, count: agg._count };
      }),
    );

    return results;
  }

  async getClaimsReport(params: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = params;
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [claims, byStatus] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        include: {
          client: { select: { firstName: true, lastName: true, companyName: true } },
          contract: { include: { company: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.claim.groupBy({ by: ['status'], where, _count: true, _sum: { indemnityAmount: true } }),
    ]);

    return { data: claims, meta: { byStatus } };
  }

  async generateContractsExcel(params: any): Promise<Buffer> {
    const report = await this.getContractsReport(params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Assurances Oued Zem';
    const sheet = workbook.addWorksheet('Contrats');

    // Header style
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4880' } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    sheet.columns = [
      { header: 'N° Contrat', key: 'contractNumber', width: 18 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Compagnie', key: 'company', width: 20 },
      { header: 'Produit', key: 'product', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Prime TTC (MAD)', key: 'primeTTC', width: 18 },
      { header: 'Date effet', key: 'effectiveDate', width: 15 },
      { header: 'Échéance', key: 'expiryDate', width: 15 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Agent', key: 'agent', width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center' };
    });

    report.data.forEach((c) => {
      sheet.addRow({
        contractNumber: c.contractNumber,
        client: c.client.type === 'INDIVIDUAL'
          ? `${c.client.firstName} ${c.client.lastName}`
          : c.client.companyName,
        company: c.company.name,
        product: c.product?.name ?? c.type,
        type: c.type,
        primeTTC: Number(c.primeTTC),
        effectiveDate: new Date(c.effectiveDate).toLocaleDateString('fr-MA'),
        expiryDate: new Date(c.expiryDate).toLocaleDateString('fr-MA'),
        status: c.status,
        agent: `${c.agent.firstName} ${c.agent.lastName}`,
      });
    });

    // Total row
    const totalRow = sheet.addRow({
      contractNumber: 'TOTAL',
      primeTTC: Number(report.meta.summary.totalPrimeTTC),
    });
    totalRow.font = { bold: true };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
