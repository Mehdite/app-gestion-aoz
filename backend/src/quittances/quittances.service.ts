import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';
import * as XLSX from 'xlsx';

/* Excel serial → JS Date */
function xlDate(val: any): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val.trim());
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function findHeaderRow(rows: any[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((c: any) => String(c).includes('Numéro Police'))) return i;
  }
  return -1;
}

const trim = (v: any) => String(v ?? '').trim();

/* Branche AXA → type interne */
function brancheToType(branche: string): string {
  const b = branche.toUpperCase();
  if (b.includes('AUTO') || b.includes('VOITURE'))  return 'AUTO';
  if (b.includes('MOTO'))                            return 'MOTO';
  if (b.includes('HABITATION') || b.includes('HOME')) return 'HOME';
  if (b.includes('SANTE') || b.includes('MALADIE')) return 'HEALTH';
  if (b.includes('VIE'))                             return 'LIFE';
  if (b.includes('TRANSPORT'))                       return 'TRANSPORT';
  if (b.includes('DECENN'))                          return 'DECENNIAL';
  if (b.includes('PRO') || b.includes('MULTIRISQUE')) return 'PROFESSIONAL';
  return 'AUTO'; // default
}

/* Détecter si c'est une société */
function isCompany(name: string): boolean {
  return /\b(SARL|SA\b|STE|ETS|ASSOC|SOCIETE|GROUP|TRANSPORT|COMPAGNIE|ENTERPRISE)\b/i.test(name);
}

@Injectable()
export class QuittancesService {
  constructor(private prisma: PrismaService) {}

  /* ------------------------------------------------------------------ */
  async findAll(params: {
    page?: number; limit?: number;
    search?: string; status?: string; moisImport?: string;
  }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { search, status, moisImport } = params;
    const where: any = {};
    if (status)     where.status     = status;
    if (moisImport) where.moisImport = moisImport;
    if (search) {
      where.OR = [
        { assure:       { contains: search } },
        { numPolice:    { contains: search } },
        { numQuittance: { contains: search } },
      ];
    }

    const [data, total, agg] = await Promise.all([
      this.prisma.quittance.findMany({
        where, skip, take, orderBy: { numPolice: 'asc' },
      }),
      this.prisma.quittance.count({ where }),
      this.prisma.quittance.aggregate({
        where,
        _sum: { primeTotale: true, commission: true, netCie: true },
      }),
    ]);

    return {
      data,
      meta: {
        total, page: p, limit: l, totalPages: Math.ceil(total / l),
        totaux: {
          primeTotale: Number(agg._sum.primeTotale ?? 0),
          commission:  Number(agg._sum.commission  ?? 0),
          netCie:      Number(agg._sum.netCie      ?? 0),
        },
      },
    };
  }

  /* ------------------------------------------------------------------ */
  async encaisser(id: string, method: string) {
    const q = await this.prisma.quittance.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Quittance introuvable');
    if (q.status === 'ENCAISSE') throw new BadRequestException('Déjà encaissée');
    return this.prisma.quittance.update({
      where: { id },
      data: { status: 'ENCAISSE', paidAt: new Date(), paidMethod: method || 'CASH' },
    });
  }

  /* ------------------------------------------------------------------ */
  async reglerTout(): Promise<{ reglees: number }> {
    const result = await this.prisma.quittance.updateMany({
      where: { status: 'IMPAYE' },
      data:  { status: 'ENCAISSE', paidAt: new Date(), paidMethod: 'VIREMENT' },
    });
    return { reglees: result.count };
  }

  async getStats() {
    return this.prisma.quittance.groupBy({
      by: ['moisImport', 'status'],
      _sum: { primeTotale: true, commission: true },
      _count: { _all: true },
      orderBy: { moisImport: 'asc' },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Alimentation Clients / Production / Commissions                      */
  /* ------------------------------------------------------------------ */
  async alimenter(agentId: string): Promise<{
    clients: number; contracts: number; commissions: number; errors: string[];
  }> {
    const axa = await this.prisma.company.findFirst({ where: { code: 'AXA' } });
    if (!axa) throw new BadRequestException('Compagnie AXA introuvable');

    const quittances = await this.prisma.quittance.findMany({
      orderBy: { dateEffet: 'asc' },
    });

    let clientsCreated    = 0;
    let contractsCreated  = 0;
    let commissionsCreated = 0;
    const errors: string[] = [];

    /* map assure normalisé → clientId */
    const clientMap   = new Map<string, string>();
    /* map numPolice → contractId */
    const contractMap = new Map<string, string>();

    /* pré-charger clients existants créés via quittances */
    const existingClients = await this.prisma.client.findMany({
      where: { source: 'QUITTANCE' },
      select: { id: true, firstName: true, lastName: true, companyName: true },
    });
    for (const c of existingClients) {
      const key = c.companyName
        ? c.companyName.toUpperCase().trim()
        : `${(c.firstName ?? '').toUpperCase().trim()} ${(c.lastName ?? '').toUpperCase().trim()}`.trim();
      clientMap.set(key, c.id);
    }

    /* pré-charger contrats AXA existants */
    const existingContracts = await this.prisma.contract.findMany({
      where: { companyId: axa.id },
      select: { id: true, contractNumber: true },
    });
    for (const c of existingContracts) {
      contractMap.set(c.contractNumber, c.id);
    }

    let phoneSeq = await this.prisma.client.count();

    /* ── Passe 1 : clients + contrats ── */
    for (const q of quittances) {
      const nomNorm = q.assure.toUpperCase().trim();
      try {
        /* Client */
        let clientId = clientMap.get(nomNorm);
        if (!clientId) {
          const company      = isCompany(q.assure);
          phoneSeq++;
          const phone        = `0600${String(phoneSeq).padStart(6, '0')}`;
          const clientNumber = `AOZ-${new Date().getFullYear()}-${String(phoneSeq).padStart(5, '0')}`;
          let data: any = { type: company ? 'COMPANY' : 'INDIVIDUAL', phone, clientNumber, source: 'QUITTANCE' };
          if (company) {
            data.companyName = q.assure.trim();
          } else {
            const parts = q.assure.trim().split(/\s+/);
            data.firstName = parts[0];
            data.lastName  = parts.slice(1).join(' ') || '-';
          }
          const newClient = await this.prisma.client.create({ data });
          clientId = newClient.id;
          clientsCreated++;
          clientMap.set(nomNorm, clientId);
        }

        /* Contrat */
        if (!contractMap.has(q.numPolice)) {
          const type     = brancheToType(q.branche);
          const contract = await this.prisma.contract.create({
            data: {
              contractNumber: q.numPolice,
              type, clientId, companyId: axa.id, agentId,
              primeTTC:      q.primeTotale,
              primeHT:       Number(q.primeNette) > 0 ? q.primeNette : q.primeTotale,
              taxes:         0,
              frequency:     'ANNUAL',
              effectiveDate: q.dateEffet,
              expiryDate:    q.dateExpiration,
              status:        'ACTIVE',
              notes:         `Import quittances ${q.moisImport}`,
            },
          });
          contractMap.set(q.numPolice, contract.id);
          contractsCreated++;
        }
      } catch (err: any) {
        errors.push(`${q.numQuittance} (${q.assure}): ${err?.message ?? 'Erreur'}`);
      }
    }

    /* ── Passe 2 : commissions — une par quittance ── */

    /* Supprimer les anciennes commissions sans numQuittance pour les
       contrats issus de quittances (créées par l'ancienne logique) */
    const contractIds = [...contractMap.values()];
    if (contractIds.length > 0) {
      await this.prisma.commission.deleteMany({
        where: { contractId: { in: contractIds }, numQuittance: null },
      });
    }

    for (const q of quittances) {
      if (Number(q.commission) <= 0) continue;
      const contractId = contractMap.get(q.numPolice);
      if (!contractId) continue;

      try {
        const commRate = Number(q.primeTotale) > 0
          ? (Number(q.commission) / Number(q.primeTotale)) * 100
          : 0;
        const qPrimeHT = Number(q.primeNette) > 0 ? Number(q.primeNette) : Number(q.primeTotale);
        const period   = `20${q.moisImport.slice(2)}-${q.moisImport.slice(0, 2)}`; // "0126" → "2026-01"

        await this.prisma.commission.upsert({
          where:  { numQuittance: q.numQuittance },
          update: { grossAmount: q.commission, netAmount: q.commission, primeHT: qPrimeHT },
          create: {
            numQuittance: q.numQuittance,
            contractId,
            companyId:   axa.id,
            agentId,
            primeHT:     qPrimeHT,
            rate:        commRate,
            grossAmount: q.commission,
            netAmount:   q.commission,
            period,
          },
        });
        commissionsCreated++;
      } catch (err: any) {
        errors.push(`Commission ${q.numQuittance}: ${err?.message ?? 'Erreur'}`);
      }
    }

    return { clients: clientsCreated, contracts: contractsCreated, commissions: commissionsCreated, errors };
  }

  /* ------------------------------------------------------------------ */
  /* Import fichier AXA                                                   */
  /* ------------------------------------------------------------------ */
  async importFromExcel(
    buffer: Buffer,
    moisImport: string,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    let imported = 0;
    let skipped  = 0;
    const errors: string[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws   = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const headerIdx = findHeaderRow(rows);
      if (headerIdx === -1) continue;

      const dataRows = rows.slice(headerIdx + 1).filter(r =>
        r.some((c: any) => c !== '' && c !== null)
        && trim(r[0]) === '603'
      );

      for (let i = 0; i < dataRows.length; i++) {
        const r      = dataRows[i];
        const rowNum = headerIdx + 2 + i;

        const numPolice    = trim(r[6]);
        const numQuittance = trim(r[7]);
        const branche      = trim(r[1]);
        const assure       = trim(r[11]);
        const dateEffet    = xlDate(r[9]);
        const dateExp      = xlDate(r[10]);
        const dateSit      = xlDate(r[13]);
        const primeNette   = parseFloat(String(r[14]).replace(',', '.')) || 0;
        const primeTotale  = parseFloat(String(r[17]).replace(',', '.')) || 0;
        const commission   = parseFloat(String(r[18]).replace(',', '.')) || 0;
        const netCie       = parseFloat(String(r[20]).replace(',', '.')) || 0;

        if (!numQuittance) continue;
        if (!dateEffet || !dateExp) {
          errors.push(`Ligne ${rowNum}: dates invalides pour ${numQuittance}`);
          continue;
        }
        if (primeTotale <= 0) {
          errors.push(`Ligne ${rowNum}: prime nulle pour ${numQuittance}`);
          continue;
        }

        try {
          await this.prisma.quittance.upsert({
            where: { numQuittance },
            update: {},
            create: {
              numPolice, numQuittance, branche, assure,
              dateEffet, dateExpiration: dateExp,
              dateSituation: dateSit ?? dateEffet,
              primeNette, primeTotale, commission, netCie,
              moisImport, status: 'IMPAYE',
            },
          });
          imported++;
        } catch (err: any) {
          if (err?.code === 'P2002') skipped++;
          else errors.push(`Ligne ${rowNum} (${numQuittance}): ${err?.message ?? 'Erreur'}`);
        }
      }
    }

    return { imported, skipped, errors };
  }
}
