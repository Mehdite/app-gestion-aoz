import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const in30Days     = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      totalClients, activeContracts, totalClaims, openClaims,
      monthPrimeTTC, monthPrimePaye, monthCommissions,
      totalPrimeTTC, totalReste,
      monthRistournes, totalRistournes,
      expiringContracts,
      moisParCompagnie, ristournesMoisDetail, compagnies,
      recentContracts, recentClaims, revenuByMonth,
    ] = await Promise.all([
      /* Clients & contrats */
      this.prisma.client.count({ where: { status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.claim.count(),
      this.prisma.claim.count({ where: { status: { in: ['DECLARED', 'IN_PROGRESS'] } } }),

      /* CA du mois = primes TTC des productions SOUSCRITES ce mois.
         On se base sur la date de souscription et non sur la date de saisie :
         une production de juillet enregistrée en août appartient à juillet. */
      this.prisma.contract.aggregate({
        where: { souscriptionDate: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { primeTTC: true },
      }),
      /* Encaissement du mois = primes payées sur ces mêmes productions */
      this.prisma.contract.aggregate({
        where: { souscriptionDate: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { primePaye: true },
      }),
      /* Commissions du mois */
      this.prisma.commission.aggregate({
        where: { period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` },
        _sum: { netAmount: true },
      }),

      /* CA total (tous les contrats) */
      this.prisma.contract.aggregate({ _sum: { primeTTC: true } }),
      /* Reste à encaisser total */
      this.prisma.contract.aggregate({ _sum: { primeTTC: true, primePaye: true, reduction: true } }),

      /* Ristournes — bucketées sur LEUR date d'effet, pas celle de la production d'origine */
      this.prisma.ristourne.aggregate({
        where: { dateEffet: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { montant: true },
      }),
      this.prisma.ristourne.aggregate({ _sum: { montant: true } }),

      /* Échéances */
      this.prisma.contract.count({
        where: { status: 'ACTIVE', expiryDate: { lte: in30Days, gte: now } },
      }),

      /* CA du mois ventilé par compagnie */
      this.prisma.contract.groupBy({
        by: ['companyId'],
        where: { souscriptionDate: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { primeTTC: true, primePaye: true },
      }),
      /* Ristournes du mois avec leur compagnie, pour les déduire de la bonne */
      this.prisma.ristourne.findMany({
        where: { dateEffet: { gte: startOfMonth, lte: endOfMonth } },
        select: { montant: true, contract: { select: { companyId: true } } },
      }),
      this.prisma.company.findMany({ select: { id: true, code: true, name: true } }),

      /* Récents */
      this.prisma.contract.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: {
          client:  { select: { firstName: true, lastName: true, companyName: true, type: true } },
          company: { select: { name: true } },
        },
      }),
      this.prisma.claim.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: { client: { select: { firstName: true, lastName: true, companyName: true } } },
      }),

      this.getMonthlyRevenue(),
    ]);

    const totalResteValue = Math.max(
      0,
      Number(totalReste._sum.primeTTC ?? 0)
      - Number(totalReste._sum.reduction ?? 0)
      - Number(totalReste._sum.primePaye ?? 0),
    );

    const monthRistournesValue = Number(monthRistournes._sum.montant ?? 0);
    const totalRistournesValue = Number(totalRistournes._sum.montant ?? 0);

    const caTotalValue    = Number(totalPrimeTTC._sum.primeTTC ?? 0) - totalRistournesValue;
    const encaisseTotal   = Number(totalReste._sum.primePaye ?? 0);
    const reductionTotale = Number(totalReste._sum.reduction ?? 0);

    /* Part des primes réellement encaissée. Rapportée à la prime NETTE
       (après réduction accordée), sinon une remise ferait chuter le taux
       alors que le client a soldé son dû. */
    const netAFacturer = Math.max(0, caTotalValue - reductionTotale);
    const tauxEncaissement = netAFacturer > 0
      ? Math.round((encaisseTotal / netAFacturer) * 100)
      : 0;

    /* CA du mois par compagnie. Les trois cartes sont toujours présentes,
       même à zéro : une compagnie absente du tableau de bord ferait douter
       d'un oubli de saisie. */
    const codeParId = new Map(compagnies.map((c) => [c.id, c.code]));
    const caParCompagnie: Record<string, { revenue: number; encaisse: number }> = {
      AXA:        { revenue: 0, encaisse: 0 },
      CAT:        { revenue: 0, encaisse: 0 },
      COVER_EDGE: { revenue: 0, encaisse: 0 },
    };

    for (const ligne of moisParCompagnie) {
      const code = codeParId.get(ligne.companyId);
      if (!code || !caParCompagnie[code]) continue;
      caParCompagnie[code].revenue  += Number(ligne._sum.primeTTC  ?? 0);
      caParCompagnie[code].encaisse += Number(ligne._sum.primePaye ?? 0);
    }

    /* Une ristourne se déduit du CA de SA compagnie, pas du total global */
    for (const r of ristournesMoisDetail) {
      const code = codeParId.get(r.contract.companyId);
      if (!code || !caParCompagnie[code]) continue;
      const montant = Number(r.montant);
      caParCompagnie[code].revenue  -= montant;
      caParCompagnie[code].encaisse -= montant;
    }

    return {
      kpis: {
        totalClients,
        activeContracts,
        totalClaims,
        openClaims,
        monthRevenue:      Number(monthPrimeTTC._sum.primeTTC ?? 0) - monthRistournesValue,
        monthEncaissement: Number(monthPrimePaye._sum.primePaye ?? 0) - monthRistournesValue,
        monthRistournes:   monthRistournesValue,
        monthCommissions:  Number(monthCommissions._sum.netAmount ?? 0),
        totalCA:           caTotalValue,
        totalRistournes:   totalRistournesValue,
        totalReste:        totalResteValue,
        totalEncaisse:     encaisseTotal,
        expiringContracts,
        tauxEncaissement,
        caParCompagnie,
      },
      recentContracts,
      recentClaims,
      revenuByMonth,
    };
  }

  async getExpiringContracts(days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.prisma.contract.findMany({
      where: { status: 'ACTIVE', expiryDate: { lte: future, gte: new Date() } },
      orderBy: { expiryDate: 'asc' },
      include: {
        client:  { select: { firstName: true, lastName: true, companyName: true, phone: true, email: true } },
        company: { select: { name: true } },
        product: { select: { name: true } },
      },
    });
  }

  private async getMonthlyRevenue() {
    const months: { month: string; revenue: number; encaissement: number; ristournes: number; commissions: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month,     0, 23, 59, 59);

      const [rev, comm, rist] = await Promise.all([
        /* Même règle que les KPI : on rattache au mois de souscription */
        this.prisma.contract.aggregate({
          where: { souscriptionDate: { gte: start, lte: end } },
          _sum: { primeTTC: true, primePaye: true },
        }),
        this.prisma.commission.aggregate({
          where: { period: `${year}-${String(month).padStart(2, '0')}` },
          _sum: { netAmount: true },
        }),
        this.prisma.ristourne.aggregate({
          where: { dateEffet: { gte: start, lte: end } },
          _sum: { montant: true },
        }),
      ]);

      const ristournes = Number(rist._sum.montant ?? 0);

      months.push({
        month:         `${String(month).padStart(2, '0')}/${year}`,
        revenue:       Number(rev._sum.primeTTC  ?? 0) - ristournes,
        encaissement:  Number(rev._sum.primePaye ?? 0) - ristournes,
        ristournes,
        commissions:   Number(comm._sum.netAmount ?? 0),
      });
    }

    return months;
  }
}
