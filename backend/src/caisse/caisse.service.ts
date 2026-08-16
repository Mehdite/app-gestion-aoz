import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloturerCaisseDto } from './dto/cloturer-caisse.dto';
import { DepenseCaisseDto } from './dto/depense-caisse.dto';
import PDFDocument = require('pdfkit');

/* Montant sans toLocaleString : le séparateur insécable étroit du format
   fr-MA n'existe pas dans les polices standard du PDF */
const mad = (n: number) => `${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD`;

const frDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

@Injectable()
export class CaisseService {
  constructor(private prisma: PrismaService) {}

  private bornes(date: string) {
    const debut = new Date(`${date}T00:00:00.000Z`);
    const fin = new Date(debut);
    fin.setUTCDate(fin.getUTCDate() + 1);
    return { debut, fin };
  }

  async getJournee(date?: string) {
    const jour = date || new Date().toISOString().slice(0, 10);
    const { debut, fin } = this.bornes(jour);

    const [mouvements, cloture, precedente] = await Promise.all([
      this.prisma.mouvementCaisse.findMany({
        where: { createdAt: { gte: debut, lt: fin } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.caisseCloture.findUnique({ where: { date: jour } }),
      /* Le solde d'ouverture repart des espèces réellement COMPTÉES à la
         dernière clôture, pas du théorique : après comptage, la réalité prime */
      this.prisma.caisseCloture.findFirst({
        where: { date: { lt: jour } },
        orderBy: { date: 'desc' },
      }),
    ]);

    const totalEntrees = mouvements.filter((m) => m.sens === 'ENTREE').reduce((s, m) => s + Number(m.montant), 0);
    const totalSorties = mouvements.filter((m) => m.sens === 'SORTIE').reduce((s, m) => s + Number(m.montant), 0);
    const soldeOuverture = Number(precedente?.especesComptees ?? 0);
    const soldeTheorique = soldeOuverture + totalEntrees - totalSorties;

    /* Pas de clé `data` à la racine : TransformInterceptor la déballerait */
    return { date: jour, soldeOuverture, mouvements, totalEntrees, totalSorties, soldeTheorique, cloture };
  }

  async cloturer(dto: CloturerCaisseDto, userId: string) {
    const j = await this.getJournee(dto.date);
    const ecart = dto.especesComptees - j.soldeTheorique;
    const data = {
      soldeOuverture:  j.soldeOuverture,
      totalEntrees:    j.totalEntrees,
      totalSorties:    j.totalSorties,
      soldeTheorique:  j.soldeTheorique,
      especesComptees: dto.especesComptees,
      ecart,
      notes:    dto.notes ?? null,
      closedBy: userId,
    };
    return this.prisma.caisseCloture.upsert({
      where: { date: j.date },
      create: { date: j.date, ...data },
      update: data,
    });
  }

  /** Dépense payée depuis le tiroir (fournitures, courses...) : sortie
   *  manuelle, pour que chaque sortie de fonds soit justifiée avant clôture */
  async ajouterDepense(dto: DepenseCaisseDto, userId: string) {
    return this.prisma.mouvementCaisse.create({
      data: {
        sens: 'SORTIE', source: 'DEPENSE',
        montant: dto.montant,
        libelle: dto.libelle.trim(),
        createdBy: userId,
      },
    });
  }

  /** Seules les dépenses manuelles se suppriment ici : les mouvements
   *  automatiques suivent leur pièce d'origine (production, versement...) */
  async supprimerDepense(id: string) {
    const mouvement = await this.prisma.mouvementCaisse.findUnique({ where: { id } });
    if (!mouvement) throw new NotFoundException('Mouvement introuvable');
    if (mouvement.source !== 'DEPENSE') {
      throw new BadRequestException(
        'Ce mouvement est automatique — il se supprime en supprimant son opération d\'origine',
      );
    }
    return this.prisma.mouvementCaisse.delete({ where: { id } });
  }

  /** Arrêté de caisse journalier — document à imprimer et signer */
  async genererArretePdf(date?: string): Promise<Buffer> {
    const j = await this.getJournee(date);
    const cloture = j.cloture;

    const doc = new PDFDocument({ size: 'A4', margins: { top: 46, bottom: 46, left: 50, right: 50 } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const fini = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const NAVY = '#091F3D';
    const GRIS = '#5A7A9A';
    const ROUGE = '#C02020';
    const VERT = '#166534';
    const largeur = doc.page.width - 100; // marges 50/50

    /* ── En-tête ── */
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(16).text('ASSURANCES OUED ZEM', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).text('Arrêté de caisse journalier', { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor(GRIS).text(`Journée du ${frDate(j.date)}`, { align: 'center' });
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(50 + largeur, doc.y).lineWidth(1).strokeColor(NAVY).stroke();
    doc.moveDown(0.8);

    /* ── Solde d'ouverture ── */
    doc.fillColor('#1A2B4A').font('Helvetica-Bold').fontSize(10)
      .text(`Solde d'ouverture (report du dernier arrêté) : ${mad(j.soldeOuverture)}`);
    doc.moveDown(0.6);

    /* ── Tableaux des mouvements ── */
    const tableau = (titre: string, lignes: typeof j.mouvements, total: number) => {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text(titre);
      doc.moveDown(0.3);
      const yDebut = doc.y;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS);
      doc.text('Heure', 50, yDebut, { width: 50 });
      doc.text('Libellé', 105, yDebut, { width: largeur - 155 });
      doc.text('Montant', 50 + largeur - 90, yDebut, { width: 90, align: 'right' });
      doc.moveDown(0.2);
      doc.moveTo(50, doc.y).lineTo(50 + largeur, doc.y).lineWidth(0.5).strokeColor('#CBD8EA').stroke();
      doc.moveDown(0.25);

      doc.font('Helvetica').fontSize(9).fillColor('#1A2B4A');
      if (lignes.length === 0) {
        doc.fillColor(GRIS).text('Aucun mouvement', 105);
        doc.moveDown(0.2);
      }
      for (const m of lignes) {
        const y = doc.y;
        const heure = new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' });
        doc.fillColor(GRIS).text(heure, 50, y, { width: 50 });
        doc.fillColor('#1A2B4A').text(m.libelle.slice(0, 80), 105, y, { width: largeur - 155 });
        doc.text(mad(Number(m.montant)), 50 + largeur - 90, y, { width: 90, align: 'right' });
        doc.moveDown(0.15);
      }
      doc.moveDown(0.15);
      doc.moveTo(50, doc.y).lineTo(50 + largeur, doc.y).lineWidth(0.5).strokeColor('#CBD8EA').stroke();
      doc.moveDown(0.25);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(NAVY)
        .text(`Total : ${mad(total)}`, 50, doc.y, { width: largeur, align: 'right' });
      doc.moveDown(0.8);
    };

    tableau('ENTRÉES — encaissements en espèces', j.mouvements.filter((m) => m.sens === 'ENTREE'), j.totalEntrees);
    tableau('SORTIES — versements banque, ristournes, dépenses, corrections', j.mouvements.filter((m) => m.sens === 'SORTIE'), j.totalSorties);

    /* ── Synthèse ── */
    doc.moveTo(50, doc.y).lineTo(50 + largeur, doc.y).lineWidth(1).strokeColor(NAVY).stroke();
    doc.moveDown(0.5);
    const ligneSynthese = (label: string, valeur: string, couleur = '#1A2B4A', gras = false) => {
      const y = doc.y;
      doc.font(gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#1A2B4A').text(label, 50, y, { width: largeur - 120 });
      doc.font('Helvetica-Bold').fillColor(couleur).text(valeur, 50 + largeur - 120, y, { width: 120, align: 'right' });
      doc.moveDown(0.35);
    };
    ligneSynthese('Solde théorique de la caisse', mad(j.soldeTheorique), NAVY, true);
    if (cloture) {
      ligneSynthese('Espèces comptées', mad(Number(cloture.especesComptees)));
      const e = Number(cloture.ecart);
      ligneSynthese('Écart', `${e > 0 ? '+' : ''}${mad(e)}`, Math.abs(e) < 0.005 ? VERT : ROUGE, true);
      if (cloture.notes) {
        doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(`Notes : ${cloture.notes}`, 50, doc.y, { width: largeur });
        doc.moveDown(0.4);
      }
    } else {
      ligneSynthese('Espèces comptées', '____________________');
      ligneSynthese('Écart', '____________________');
    }

    /* ── Signatures ── */
    doc.moveDown(1.2);
    const ySig = doc.y;
    const boite = (x: number, titre: string) => {
      const w = (largeur - 20) / 2;
      doc.lineWidth(0.75).strokeColor('#CBD8EA').rect(x, ySig, w, 110).stroke();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(NAVY).text(titre, x + 12, ySig + 10, { width: w - 24 });
      doc.font('Helvetica').fontSize(9).fillColor('#1A2B4A');
      doc.text('Nom : ______________________________', x + 12, ySig + 32, { width: w - 24 });
      doc.text('Date : ______________________________', x + 12, ySig + 52, { width: w - 24 });
      doc.fillColor(GRIS).text('Signature :', x + 12, ySig + 74, { width: w - 24 });
    };
    boite(50, 'Arrêté par la caissière');
    boite(50 + (largeur - 20) / 2 + 20, 'Contrôlé par le superviseur');

    /* ── Pied ── */
    doc.font('Helvetica').fontSize(7.5).fillColor(GRIS)
      .text(`Document généré le ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })} — Assurances Oued Zem`,
        50, doc.page.height - 60, { width: largeur, align: 'center' });

    doc.end();
    return fini;
  }
}
