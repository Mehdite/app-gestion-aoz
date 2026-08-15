import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRistourneDto } from './dto/create-ristourne.dto';

@Injectable()
export class RistournesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRistourneDto, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: dto.contractId } });
    if (!contract) throw new NotFoundException('Production introuvable');

    const ristourne = await this.prisma.ristourne.create({
      data: {
        contractId: dto.contractId,
        montant:    dto.montant,
        dateEffet:  new Date(dto.dateEffet),
        motif:      dto.motif,
        notes:      dto.notes,
        createdBy:  userId,
      },
      include: { contract: { include: { client: true, company: true } } },
    });

    /* Le contrat n'a plus d'objet assuré : on l'annule pour qu'il sorte
       des relances de renouvellement */
    await this.prisma.contract.update({
      where: { id: dto.contractId },
      data: { status: 'CANCELLED', cancelledAt: new Date(dto.dateEffet) },
    });

    /* Le remboursement sort du tiroir-caisse */
    this.prisma.mouvementCaisse.create({
      data: {
        sens: 'SORTIE', source: 'RISTOURNE',
        montant: dto.montant,
        libelle: `Ristourne ${contract.contractNumber}`,
        contractId: dto.contractId, refId: ristourne.id, createdBy: userId,
      },
    }).catch(() => {});

    return ristourne;
  }

  async findAll(params: { mois?: string; companyCode?: string; search?: string }) {
    const { mois, companyCode, search } = params;
    const where: any = {};

    if (mois) {
      const [y, m] = mois.split('-').map(Number);
      where.dateEffet = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    const contractFilter: any = {};
    if (companyCode) contractFilter.company = { code: companyCode };
    if (search) {
      contractFilter.OR = [
        { contractNumber: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
        { client: { companyName: { contains: search } } },
      ];
    }
    if (Object.keys(contractFilter).length > 0) where.contract = contractFilter;

    const [ristournes, agg] = await Promise.all([
      this.prisma.ristourne.findMany({
        where,
        orderBy: { dateEffet: 'desc' },
        include: {
          contract: {
            select: {
              id: true, contractNumber: true, type: true, primeTTC: true,
              effectiveDate: true, expiryDate: true,
              client:  { select: { firstName: true, lastName: true, companyName: true, type: true, phone: true } },
              company: { select: { name: true, code: true } },
            },
          },
        },
      }),
      this.prisma.ristourne.aggregate({ where, _sum: { montant: true }, _count: true }),
    ]);

    /* Pas de clé `data` à la racine : TransformInterceptor la déballerait
       et perdrait `stats` au passage */
    return {
      ristournes,
      stats: {
        count: agg._count,
        total: Number(agg._sum.montant ?? 0),
      },
    };
  }

  async remove(id: string) {
    const ristourne = await this.prisma.ristourne.findUnique({ where: { id } });
    if (!ristourne) throw new NotFoundException('Ristourne introuvable');

    /* Le contrat redevient actif : la ristourne était une erreur de saisie */
    await this.prisma.contract.update({
      where: { id: ristourne.contractId },
      data: { status: 'ACTIVE', cancelledAt: null },
    });

    /* La sortie de caisse liée disparaît avec elle */
    await this.prisma.mouvementCaisse.deleteMany({ where: { refId: id } });

    return this.prisma.ristourne.delete({ where: { id } });
  }
}
