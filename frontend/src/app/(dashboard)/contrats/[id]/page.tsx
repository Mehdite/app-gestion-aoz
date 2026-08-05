'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import {
  cn, clientName, formatCurrency, formatDate,
  insuranceTypeLabels, sousCategorieLabels, statusColor, statusLabels,
} from '@/lib/utils';
import {
  ArrowLeft, Phone, Mail, MapPin, CreditCard, Building2, User, FileText,
  Calendar, Banknote, RefreshCw, Receipt, AlertTriangle, ArrowRight,
} from 'lucide-react';

/** Une ligne « libellé : valeur » du bloc d'informations */
function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 text-right font-medium">{children}</span>
    </div>
  );
}

const vide = <span className="text-gray-300 font-normal">—</span>;

export default function DetailProductionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => apiHelper.get<any>(`/contracts/${id}`),
    retry: false,
  });

  const c = (data as any)?.data ?? null;

  if (isLoading) {
    return (
      <div>
        <Header title="Détail de la production" />
        <div className="p-6 space-y-4 max-w-4xl">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card"><div className="animate-pulse bg-gray-100 rounded h-24 w-full" /></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !c) {
    return (
      <div>
        <Header title="Détail de la production" />
        <div className="p-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="card max-w-lg text-center py-10">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Production introuvable</p>
            <p className="text-sm text-gray-500 mt-1">Elle a peut-être été supprimée.</p>
          </div>
        </div>
      </div>
    );
  }

  const ttc       = Number(c.primeTTC)  || 0;
  const reduction = Number(c.reduction) || 0;
  const paye      = Number(c.primePaye) || 0;
  const nette     = Math.max(0, ttc - reduction);
  const reste     = Math.max(0, nette - paye);
  const estSociete = c.client?.type === 'COMPANY';

  const joursRestants = Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / 86_400_000);
  const totalRistournes = (c.ristournes ?? []).reduce((s: number, r: any) => s + Number(r.montant), 0);

  return (
    <div>
      <Header title="Détail de la production" />
      <div className="p-6 space-y-5 max-w-4xl">

        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Bandeau */}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 font-mono">{c.contractNumber}</h2>
                <span className={cn('badge', statusColor[c.status])}>{statusLabels[c.status] ?? c.status}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {c.company?.name} · {insuranceTypeLabels[c.type] ?? c.type}
                {c.sousCategorie && <> · {sousCategorieLabels[c.sousCategorie] ?? c.sousCategorie}</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Prime TTC</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(ttc)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Client */}
          <div className="card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              {estSociete ? <Building2 className="w-4 h-4 text-brand-600" /> : <User className="w-4 h-4 text-brand-600" />}
              Client
            </h3>
            <p className="text-base font-semibold text-gray-900 mb-2">{clientName(c.client)}</p>
            <Ligne label="Téléphone">
              {c.client?.phone
                ? <a href={`tel:${c.client.phone}`} className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700">
                    <Phone className="w-3.5 h-3.5" /> {c.client.phone}
                  </a>
                : vide}
            </Ligne>
            {c.client?.phone2 && (
              <Ligne label="Téléphone 2">
                <a href={`tel:${c.client.phone2}`} className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700">
                  <Phone className="w-3.5 h-3.5" /> {c.client.phone2}
                </a>
              </Ligne>
            )}
            <Ligne label={estSociete ? 'ICE' : 'CIN'}>
              {(estSociete ? c.client?.ice : c.client?.cin)
                ? <span className="inline-flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-gray-400" />{estSociete ? c.client.ice : c.client.cin}</span>
                : vide}
            </Ligne>
            <Ligne label="Email">
              {c.client?.email
                ? <a href={`mailto:${c.client.email}`} className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700">
                    <Mail className="w-3.5 h-3.5" /> {c.client.email}
                  </a>
                : vide}
            </Ligne>
            <Ligne label="Ville">
              {c.client?.city
                ? <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{c.client.city}</span>
                : vide}
            </Ligne>
            <Ligne label="N° client">{c.client?.clientNumber ?? vide}</Ligne>
          </div>

          {/* Contrat */}
          <div className="card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <FileText className="w-4 h-4 text-brand-600" /> Contrat
            </h3>
            <Ligne label="N° police"><span className="font-mono">{c.contractNumber}</span></Ligne>
            <Ligne label="Compagnie">{c.company?.name ?? vide}</Ligne>
            <Ligne label="Type">
              {insuranceTypeLabels[c.type] ?? c.type}
              {c.sousCategorie && <span className="text-gray-400"> · {sousCategorieLabels[c.sousCategorie] ?? c.sousCategorie}</span>}
            </Ligne>
            <Ligne label="Fréquence">
              {({ ANNUAL: 'Annuelle', SEMI_ANNUAL: 'Semestrielle', QUARTERLY: 'Trimestrielle', MONTHLY: 'Mensuelle' } as Record<string, string>)[c.frequency] ?? c.frequency}
            </Ligne>
            <Ligne label="Statut"><span className={cn('badge', statusColor[c.status])}>{statusLabels[c.status] ?? c.status}</span></Ligne>
            <Ligne label="Saisie par">
              {c.agent ? `${c.agent.firstName ?? ''} ${c.agent.lastName ?? ''}`.trim() : vide}
            </Ligne>
          </div>

          {/* Période */}
          <div className="card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <Calendar className="w-4 h-4 text-brand-600" /> Période de couverture
            </h3>
            <Ligne label="Date de souscription">{formatDate(c.souscriptionDate ?? c.createdAt)}</Ligne>
            <Ligne label="Date d'effet">{formatDate(c.effectiveDate)}</Ligne>
            <Ligne label="Date d'échéance">
              <span className={cn(joursRestants < 0 && 'text-red-600')}>{formatDate(c.expiryDate)}</span>
            </Ligne>
            <Ligne label="Échéance">
              {c.status === 'CANCELLED'
                ? <span className="text-gray-400">Contrat annulé</span>
                : joursRestants > 0
                  ? <span className="text-gray-700">Dans {joursRestants} jour{joursRestants > 1 ? 's' : ''}</span>
                  : joursRestants === 0
                    ? <span className="text-orange-600 font-semibold">Aujourd&apos;hui</span>
                    : <span className="text-red-600 font-semibold">Dépassée de {Math.abs(joursRestants)} jour{Math.abs(joursRestants) > 1 ? 's' : ''}</span>}
            </Ligne>
            {c.cancelledAt && <Ligne label="Annulé le">{formatDate(c.cancelledAt)}</Ligne>}
          </div>

          {/* Primes */}
          <div className="card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <Banknote className="w-4 h-4 text-brand-600" /> Primes
            </h3>
            <Ligne label="Prime TTC"><span className="tabular-nums">{formatCurrency(ttc)}</span></Ligne>
            <Ligne label="Réduction">
              {reduction > 0 ? <span className="tabular-nums">− {formatCurrency(reduction)}</span> : vide}
            </Ligne>
            <Ligne label="Prime nette"><span className="tabular-nums font-semibold">{formatCurrency(nette)}</span></Ligne>
            <Ligne label="Encaissé">
              {paye > 0 ? <span className="tabular-nums text-green-700">{formatCurrency(paye)}</span> : vide}
            </Ligne>
            <div className="flex items-center justify-between gap-4 pt-3 mt-1 border-t-2 border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Reste dû</span>
              {reste > 0
                ? <span className="text-lg font-bold text-red-600 tabular-nums">{formatCurrency(reste)}</span>
                : <span className="badge bg-green-50 text-green-700">Soldé</span>}
            </div>
          </div>
        </div>

        {/* Ristournes */}
        {(c.ristournes ?? []).length > 0 && (
          <div className="card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <Receipt className="w-4 h-4 text-red-600" /> Ristourne
              <span className="badge bg-red-50 text-red-700">− {formatCurrency(totalRistournes)}</span>
            </h3>
            <div className="space-y-2">
              {c.ristournes.map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50/50 border border-red-100 rounded-lg text-sm">
                  <div>
                    <p className="font-semibold text-red-700 tabular-nums">− {formatCurrency(r.montant)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.motif || 'Sans motif'}</p>
                  </div>
                  <p className="text-xs text-gray-500">Effet le {formatDate(r.dateEffet)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chaîne de renouvellement */}
        {(c.renewedFrom || c.renewedTo) && (
          <div className="card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <RefreshCw className="w-4 h-4 text-brand-600" /> Renouvellement
            </h3>
            <div className="space-y-2 text-sm">
              {c.renewedFrom && (
                <Link href={`/contrats/${c.renewedFrom.id}`} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg hover:border-brand-300 transition-colors">
                  <span className="text-gray-600">Renouvelle la période précédente</span>
                  <span className="flex items-center gap-2 text-gray-700">
                    {formatDate(c.renewedFrom.effectiveDate)} → {formatDate(c.renewedFrom.expiryDate)}
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                </Link>
              )}
              {c.renewedTo && (
                <Link href={`/contrats/${c.renewedTo.id}`} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-green-50 border border-green-100 rounded-lg hover:border-green-300 transition-colors">
                  <span className="text-green-700 font-medium">A été renouvelé</span>
                  <span className="flex items-center gap-2 text-gray-700">
                    {formatDate(c.renewedTo.effectiveDate)} → {formatDate(c.renewedTo.expiryDate)}
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Sinistres */}
        {(c.claims ?? []).length > 0 && (
          <div className="card">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Sinistres
              <span className="badge bg-amber-50 text-amber-700">{c.claims.length}</span>
            </h3>
            <div className="space-y-2">
              {c.claims.map((s: any) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                  <div>
                    <p className="font-mono text-xs font-medium text-gray-900">{s.claimNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">{s.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{formatDate(s.incidentDate)}</span>
                    <span className={cn('badge', statusColor[s.status])}>{statusLabels[s.status] ?? s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
