import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVersementDto } from './dto/create-versement.dto';

@Injectable()
export class VersementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVersementDto, userId: string) {
    return this.prisma.versement.create({
      data: {
        type:      dto.type,
        montant:   dto.montant,
        date:      new Date(dto.date),
        reference: dto.reference,
        banque:    dto.banque,
        notes:     dto.notes,
        createdBy: userId,
      },
    });
  }

  async findAll(params: { annee?: string; type?: string }) {
    const { annee, type } = params;
    const year = Number(annee) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end   = new Date(year + 1, 0, 1);

    const where: any = { date: { gte: start, lt: end } };
    if (type) where.type = type;

    const [versements, parType] = await Promise.all([
      this.prisma.versement.findMany({ where, orderBy: { date: 'desc' } }),
      this.prisma.versement.groupBy({ by: ['type'], where, _sum: { montant: true } }),
    ]);

    const totalVersement = Number(parType.find((t) => t.type === 'VERSEMENT')?._sum.montant ?? 0);
    const totalVirement  = Number(parType.find((t) => t.type === 'VIREMENT')?._sum.montant ?? 0);

    /* Rapprochement annuel cumulé : une facilité accordée en février peut être
       encaissée en mai — sur l'année entière, les deux totaux doivent se rejoindre. */
    const [primes, ristournes] = await Promise.all([
      this.prisma.contract.aggregate({
        where: { createdAt: { gte: start, lt: end } },
        _sum: { primePaye: true },
      }),
      this.prisma.ristourne.aggregate({
        where: { dateEffet: { gte: start, lt: end } },
        _sum: { montant: true },
      }),
    ]);

    const primesEncaissees = Number(primes._sum.primePaye ?? 0);
    const totalRistournes  = Number(ristournes._sum.montant ?? 0);
    const attendu          = primesEncaissees - totalRistournes;
    const totalBanque      = totalVersement + totalVirement;

    /* Pas de clé `data` à la racine : TransformInterceptor la déballerait
       et perdrait `stats` / `rapprochement` au passage */
    return {
      versements,
      annee: year,
      stats: {
        count: versements.length,
        totalVersement,
        totalVirement,
        totalBanque,
      },
      rapprochement: {
        primesEncaissees,
        totalRistournes,
        attendu,
        totalBanque,
        ecart: totalBanque - attendu,
      },
    };
  }

  async remove(id: string) {
    const versement = await this.prisma.versement.findUnique({ where: { id } });
    if (!versement) throw new NotFoundException('Versement introuvable');
    return this.prisma.versement.delete({ where: { id } });
  }
}
