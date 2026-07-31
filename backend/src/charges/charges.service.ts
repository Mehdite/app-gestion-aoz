import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto, UpdateChargeDto } from './dto/create-charge.dto';

@Injectable()
export class ChargesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChargeDto, userId: string) {
    return this.prisma.charge.create({
      data: {
        mois:        dto.mois,
        categorie:   dto.categorie,
        libelle:     dto.libelle,
        montant:     dto.montant,
        isRecurrent: dto.isRecurrent ?? false,
        notes:       dto.notes,
        createdBy:   userId,
      },
    });
  }

  /** Reporte les charges récurrentes du mois précédent le plus proche.
   *  Ne s'applique que si le mois demandé est encore vide — une fois que
   *  l'utilisateur a touché au mois, on ne réinjecte plus rien. */
  private async reporterRecurrentes(mois: string, userId: string) {
    const dejaSaisi = await this.prisma.charge.count({ where: { mois } });
    if (dejaSaisi > 0) return;

    /* Le format "AAAA-MM" se trie correctement en lexicographique */
    const precedente = await this.prisma.charge.findFirst({
      where: { mois: { lt: mois }, isRecurrent: true },
      orderBy: { mois: 'desc' },
      select: { mois: true },
    });
    if (!precedente) return;

    const modeles = await this.prisma.charge.findMany({
      where: { mois: precedente.mois, isRecurrent: true },
    });
    if (modeles.length === 0) return;

    await this.prisma.charge.createMany({
      data: modeles.map((m) => ({
        mois,
        categorie:   m.categorie,
        libelle:     m.libelle,
        montant:     m.montant,
        isRecurrent: true,
        notes:       m.notes,
        createdBy:   userId,
      })),
    });
  }

  async findAll(params: { mois?: string; categorie?: string }, userId: string) {
    const now = new Date();
    const mois = params.mois || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await this.reporterRecurrentes(mois, userId);

    const where: any = { mois };
    if (params.categorie) where.categorie = params.categorie;

    const [charges, parCategorie, agg] = await Promise.all([
      this.prisma.charge.findMany({ where, orderBy: [{ categorie: 'asc' }, { libelle: 'asc' }] }),
      this.prisma.charge.groupBy({ by: ['categorie'], where, _sum: { montant: true } }),
      this.prisma.charge.aggregate({ where, _sum: { montant: true }, _count: true }),
    ]);

    /* Pas de clé `data` à la racine : TransformInterceptor la déballerait
       et perdrait `stats` au passage */
    return {
      charges,
      mois,
      stats: {
        count: agg._count,
        total: Number(agg._sum.montant ?? 0),
        parCategorie: parCategorie.map((c) => ({
          categorie: c.categorie,
          total: Number(c._sum.montant ?? 0),
        })),
      },
    };
  }

  async update(id: string, dto: UpdateChargeDto) {
    const charge = await this.prisma.charge.findUnique({ where: { id } });
    if (!charge) throw new NotFoundException('Charge introuvable');
    return this.prisma.charge.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const charge = await this.prisma.charge.findUnique({ where: { id } });
    if (!charge) throw new NotFoundException('Charge introuvable');
    return this.prisma.charge.delete({ where: { id } });
  }
}
