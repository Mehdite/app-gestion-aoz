import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateContractDto, agentId: string) {
    const contractNumber = dto.contractNumber || await this.generateContractNumber(dto.type);
    const { contractNumber: _cn, ...rest } = dto;
    const primeHT  = rest.primeHT  ?? rest.primeTTC;
    const taxes    = rest.taxes    ?? 0;
    const contract = await this.prisma.contract.create({
      data: { ...rest, primeHT, taxes, contractNumber, agentId },
      include: { client: true, company: true, product: true },
    });
    await this.createRenewalAlerts(contract.id, new Date(dto.expiryDate));
    await this.createCommission(contract);
    return contract;
  }

  async findAll(params: {
    page?: number; limit?: number; search?: string; status?: string;
    type?: string; companyId?: string; clientId?: string; agentId?: string; expiringIn?: number;
    mois?: string;
  }) {
    const { skip, take, page: p, limit: l } = paginate(params.page, params.limit);
    const { search, status, type, companyId, clientId, agentId, expiringIn, mois } = params;
    const where: any = {};
    if (status)    where.status = status;
    if (type)      where.type = type;
    if (companyId) where.companyId = companyId;
    if (clientId)  where.clientId = clientId;
    if (agentId)   where.agentId = agentId;

    if (expiringIn) {
      const future = new Date();
      future.setDate(future.getDate() + Number(expiringIn));
      where.expiryDate = { lte: future, gte: new Date() };
      where.status = 'ACTIVE';
    }

    if (mois) {
      const [y, m] = mois.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end   = new Date(y, m, 1);
      where.effectiveDate = { gte: start, lt: end };
    }

    if (search) {
      where.OR = [
        { contractNumber: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
        { client: { companyName: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where, skip, take, orderBy: { contractNumber: 'asc' },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, companyName: true, type: true, phone: true } },
          company: { select: { id: true, name: true, logo: true } },
          product: { select: { id: true, name: true, type: true } },
          agent: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { claims: true } },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        client: true, company: true, product: true,
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
        claims: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        commissions: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        history: { orderBy: { createdAt: 'desc' }, take: 20 },
        renewalAlerts: true,
      },
    });
    if (!contract) throw new NotFoundException('Contrat non trouvé');
    return contract;
  }

  async update(id: string, dto: UpdateContractDto, changedBy: string) {
    const existing = await this.findOne(id);
    const contract = await this.prisma.contract.update({ where: { id }, data: dto });
    const changes = Object.entries(dto).map(([field, newValue]) => ({
      contractId: id, field,
      oldValue: String((existing as any)[field] ?? ''),
      newValue: String(newValue ?? ''),
      changedBy,
    }));
    if (changes.length > 0) await this.prisma.contractHistory.createMany({ data: changes });
    return contract;
  }

  async cancel(id: string, reason: string, userId: string) {
    const contract = await this.findOne(id);
    return this.prisma.contract.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: contract.notes ? `${contract.notes}\nAnnulation: ${reason}` : `Annulation: ${reason}`,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.contract.delete({ where: { id } });
  }

  async renew(id: string, userId: string) {
    const contract = await this.findOne(id);
    const newExpiry = new Date(contract.expiryDate);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    const contractNumber = await this.generateContractNumber(contract.type);
    return this.prisma.contract.create({
      data: {
        contractNumber, status: 'ACTIVE', type: contract.type,
        clientId: contract.clientId, companyId: contract.companyId,
        productId: contract.productId, agentId: userId,
        primeTTC: contract.primeTTC, primeHT: contract.primeHT, taxes: contract.taxes,
        frequency: contract.frequency, effectiveDate: contract.expiryDate,
        expiryDate: newExpiry, autoRenew: contract.autoRenew, renewedAt: new Date(),
      },
    });
  }

  private async createRenewalAlerts(contractId: string, expiryDate: Date) {
    const days = [60, 30, 15, 7, 3];
    await this.prisma.renewalAlert.createMany({
      data: days.map((d) => ({ contractId, daysBeforeExpiry: d })),
    });
  }

  private async createCommission(contract: any) {
    if (!contract.productId) return;
    const product = await this.prisma.companyProduct.findUnique({ where: { id: contract.productId } });
    if (!product) return;
    const rate = Number(product.commissionRate);
    const grossAmount = Number(contract.primeHT) * (rate / 100);
    await this.prisma.commission.create({
      data: {
        contractId: contract.id, companyId: contract.companyId, agentId: contract.agentId,
        primeHT: contract.primeHT, rate: product.commissionRate,
        grossAmount, netAmount: grossAmount,
        period: new Date().toISOString().slice(0, 7),
      },
    });
  }

  private async generateContractNumber(type: string): Promise<string> {
    const count = await this.prisma.contract.count();
    return `${type.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  /* ---------------------------------------------------------------- */
  /* Modèle Excel vierge                                               */
  /* ---------------------------------------------------------------- */
  generateImportTemplate(): Buffer {
    const wb = XLSX.utils.book_new();

    const headers = [
      'N° Police AXA', 'Type Assurance', 'Type Client',
      'Prénom', 'Nom', 'Raison Sociale',
      'Téléphone', 'CIN', 'ICE', 'Ville', 'Email',
      'Prime TTC', 'Réduction', 'Primes Payées',
      'Fréquence', 'Date Effet (AAAA-MM-JJ)', 'Date Echéance (AAAA-MM-JJ)', 'Notes',
    ];

    const example = [
      'AXA-2024-001234', 'AUTO', 'INDIVIDUAL',
      'Mohammed', 'Alaoui', '',
      '0661234567', 'AB123456', '', 'Oued Zem', 'client@email.ma',
      '3500', '0', '3500',
      'ANNUAL', '2024-01-01', '2025-01-01', 'RAS',
    ];

    const example2 = [
      '', 'HOME', 'COMPANY',
      '', '', 'Transport OZ SARL',
      '0523456789', '', '001234567000001', 'Oued Zem', '',
      '8000', '200', '8000',
      'ANNUAL', '2024-03-15', '2025-03-15', '',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, example, example2]);

    /* Largeurs colonnes */
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 22 },
      { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 22 },
      { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Production');

    /* Onglet légende */
    const legend = XLSX.utils.aoa_to_sheet([
      ['Champ', 'Valeurs acceptées', 'Obligatoire'],
      ['Type Assurance', 'AUTO / MOTO / HOME / HEALTH / PROFESSIONAL / DECENNIAL / TRANSPORT / LIFE / OTHER', 'Oui'],
      ['Type Client', 'INDIVIDUAL (particulier) / COMPANY (entreprise)', 'Oui'],
      ['Prénom + Nom', 'Pour les particuliers (INDIVIDUAL)', 'Si particulier'],
      ['Raison Sociale', 'Pour les entreprises (COMPANY)', 'Si entreprise'],
      ['Téléphone', 'Format marocain, ex: 0661234567', 'Oui'],
      ['CIN', 'Carte nationale (particuliers)', 'Non'],
      ['ICE', 'Identifiant fiscal (entreprises)', 'Non'],
      ['Prime TTC', 'Montant en MAD, ex: 3500', 'Oui'],
      ['Réduction', 'Montant en MAD (0 si aucune)', 'Non'],
      ['Primes Payées', 'Montant encaissé en MAD', 'Non'],
      ['Fréquence', 'ANNUAL / SEMI_ANNUAL / QUARTERLY / MONTHLY', 'Oui'],
      ['Date Effet', 'Format AAAA-MM-JJ, ex: 2024-01-15', 'Oui'],
      ['Date Echéance', 'Format AAAA-MM-JJ (auto +1 an si vide)', 'Non'],
    ]);
    legend['!cols'] = [{ wch: 20 }, { wch: 60 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, legend, 'Légende');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /* ---------------------------------------------------------------- */
  /* Import Excel                                                      */
  /* ---------------------------------------------------------------- */
  async importFromExcel(buffer: Buffer, agentId: string): Promise<{ imported: number; errors: string[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) throw new BadRequestException('Le fichier est vide ou ne contient pas de données');

    /* Récupérer l'ID AXA */
    const axa = await this.prisma.company.findFirst({ where: { code: 'AXA' } });
    if (!axa) throw new BadRequestException('Compagnie AXA introuvable en base');

    const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''));

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowNum = i + 2;
      const r = dataRows[i];

      const [
        contractNumber, typeAssurance, typeClient,
        prenom, nom, raisonSociale,
        telephone, cin, ice, ville, email,
        primeTTCRaw, reductionRaw, primePeyeRaw,
        frequenceRaw, dateEffetRaw, dateEcheanceRaw, notes,
      ] = r.map((c: any) => String(c ?? '').trim());

      /* Validation de base */
      const VALID_TYPES  = ['AUTO','MOTO','HOME','HEALTH','PROFESSIONAL','DECENNIAL','TRANSPORT','LIFE','OTHER'];
      const VALID_FREQS  = ['ANNUAL','SEMI_ANNUAL','QUARTERLY','MONTHLY'];

      if (!VALID_TYPES.includes(typeAssurance.toUpperCase())) {
        errors.push(`Ligne ${rowNum}: Type assurance invalide "${typeAssurance}"`);
        continue;
      }
      const primeTTC = parseFloat(primeTTCRaw.replace(',', '.'));
      if (isNaN(primeTTC) || primeTTC <= 0) {
        errors.push(`Ligne ${rowNum}: Prime TTC invalide "${primeTTCRaw}"`);
        continue;
      }
      if (!dateEffetRaw) {
        errors.push(`Ligne ${rowNum}: Date d'effet manquante`);
        continue;
      }

      const effectiveDate = new Date(dateEffetRaw);
      if (isNaN(effectiveDate.getTime())) {
        errors.push(`Ligne ${rowNum}: Date d'effet invalide "${dateEffetRaw}"`);
        continue;
      }

      let expiryDate: Date;
      if (dateEcheanceRaw) {
        expiryDate = new Date(dateEcheanceRaw);
        if (isNaN(expiryDate.getTime())) {
          expiryDate = new Date(effectiveDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }
      } else {
        expiryDate = new Date(effectiveDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      const reduction = parseFloat(reductionRaw.replace(',', '.')) || 0;
      const primePaye = parseFloat(primePeyeRaw.replace(',', '.')) || 0;
      const frequency = VALID_FREQS.includes((frequenceRaw || '').toUpperCase())
        ? frequenceRaw.toUpperCase()
        : 'ANNUAL';
      const clientType = typeClient.toUpperCase() === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';

      try {
        /* Trouver ou créer le client */
        const phoneForSearch = telephone || null;
        let client = phoneForSearch
          ? await this.prisma.client.findFirst({ where: { phone: phoneForSearch } })
          : null;

        if (!client) {
          const clientNumber = await this.generateClientNumber();
          // If no phone, use contract number as placeholder so field is never empty
          const phoneValue = telephone || `IMP-${contractNumber || clientNumber}`;
          const clientData: any = { type: clientType, phone: phoneValue, clientNumber };
          if (clientType === 'INDIVIDUAL') {
            if (prenom)  clientData.firstName = prenom;
            if (nom)     clientData.lastName  = nom;
            if (cin)     clientData.cin       = cin;
          } else {
            clientData.companyName = raisonSociale || nom || `Client ${clientNumber}`;
            if (ice)     clientData.ice       = ice;
          }
          if (email) clientData.email = email;
          if (ville) clientData.city  = ville;

          client = await this.prisma.client.create({ data: clientData });
        }

        /* Créer le contrat */
        const cNumber = contractNumber || await this.generateContractNumber(typeAssurance.toUpperCase());
        await this.prisma.contract.create({
          data: {
            contractNumber: cNumber,
            type:           typeAssurance.toUpperCase(),
            clientId:       client.id,
            companyId:      axa.id,
            agentId,
            primeTTC,
            primeHT:        primeTTC,
            taxes:          0,
            reduction,
            primePaye,
            frequency,
            effectiveDate,
            expiryDate,
            status:         'ACTIVE',
            notes:          notes || null,
          },
        });

        imported++;
      } catch (err: any) {
        errors.push(`Ligne ${rowNum}: ${err?.message ?? 'Erreur inconnue'}`);
      }
    }

    return { imported, errors };
  }

  private async generateClientNumber(): Promise<string> {
    const count = await this.prisma.client.count();
    return `AOZ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
}
