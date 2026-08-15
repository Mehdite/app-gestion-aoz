'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, clientName, formatCurrency, formatDate, insuranceTypeLabels, sousCategorieLabels } from '@/lib/utils';
import { Phone, Eye, Hourglass, AlertTriangle, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const COMPANY_OPTIONS = [
  { value: '',           label: 'Toutes compagnies' },
  { value: 'AXA',        label: 'AXA' },
  { value: 'CAT',        label: 'CAT' },
  { value: 'COVER_EDGE', label: 'Cover Edge' },
];

function joursLabel(expiryDate: string) {
  const jours = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  if (jours > 0)   return { text: `Dans ${jours} j`, color: 'text-gray-700' };
  if (jours === 0) return { text: "Aujourd'hui", color: 'text-orange-600 font-semibold' };
  return { text: `Dépassée de ${Math.abs(jours)} j`, color: 'text-red-600 font-semibold' };
}

export default function ProvisoiresPage() {
  const qc = useQueryClient();
  const [companyCode, setCompanyCode] = useState('');

  const queryKey = ['provisoires', { companyCode }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiHelper.get<any>('/contracts/provisoires', {
      companyCode: companyCode || undefined,
    }),
  });

  const provisoires = (data as any)?.data?.provisoires ?? [];
  const stats       = (data as any)?.data?.stats ?? { count: 0, depassees: 0 };

  const definitiveMut = useMutation({
    mutationFn: (id: string) => apiHelper.patch(`/contracts/${id}/definitive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provisoires'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Attestation définitive remise — échéance et prime complètes appliquées');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erreur lors de la bascule'));
    },
  });

  return (
    <div>
      <Header title="Attestations provisoires" />
      <div className="p-6 space-y-5">

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <select className="input w-48" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)}>
            {COMPANY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">En attente</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoading
                    ? <span className="animate-pulse bg-gray-200 rounded h-7 w-10 inline-block" />
                    : stats.count}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Attestations définitives à remettre</p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0 ml-2 text-amber-600 bg-amber-50">
                <Hourglass className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Provisoires échues</p>
                <p className={cn('text-2xl font-bold mt-1', stats.depassees > 0 ? 'text-red-600' : 'text-gray-900')}>
                  {isLoading
                    ? <span className="animate-pulse bg-gray-200 rounded h-7 w-10 inline-block" />
                    : stats.depassees}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Clients à rappeler en urgence</p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0 ml-2 text-red-600 bg-red-50">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell">Client</th>
                  <th className="table-header-cell">Téléphone</th>
                  <th className="table-header-cell">N° Police</th>
                  <th className="table-header-cell">Compagnie</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Prime provisoire</th>
                  <th className="table-header-cell">Prime définitive</th>
                  <th className="table-header-cell">Reliquat à venir</th>
                  <th className="table-header-cell">Échéance provisoire</th>
                  <th className="table-header-cell">Échéance définitive</th>
                  <th className="table-header-cell w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(11)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-16" /></td>
                  ))}</tr>
                ))}
                {!isLoading && provisoires.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400 text-sm">
                    Aucune attestation provisoire en attente
                  </td></tr>
                )}
                {provisoires.map((c: any) => {
                  const jl = joursLabel(c.expiryDate);
                  const primeDef = c.primeDefinitive != null ? Number(c.primeDefinitive) : null;
                  const reliquat = primeDef != null
                    ? Math.max(0, primeDef - Number(c.reduction) - Number(c.primePaye))
                    : null;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <p className="text-sm font-medium">{clientName(c.client)}</p>
                      </td>
                      <td className="table-cell">
                        {c.client?.phone ? (
                          <a href={`tel:${c.client.phone}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                            <Phone className="w-3.5 h-3.5" /> {c.client.phone}
                          </a>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="table-cell font-mono text-xs font-medium text-gray-900">{c.contractNumber}</td>
                      <td className="table-cell">
                        <span className="badge bg-blue-50 text-blue-700">{c.company?.code}</span>
                      </td>
                      <td className="table-cell text-sm">
                        {insuranceTypeLabels[c.type] ?? c.type}
                        {c.sousCategorie && <span className="text-gray-400"> · {sousCategorieLabels[c.sousCategorie] ?? c.sousCategorie}</span>}
                      </td>
                      <td className="table-cell text-sm tabular-nums">{formatCurrency(c.primeTTC)}</td>
                      <td className="table-cell text-sm font-semibold tabular-nums">
                        {primeDef != null ? formatCurrency(primeDef) : <span className="text-gray-300 font-normal">—</span>}
                      </td>
                      <td className="table-cell">
                        {reliquat != null && reliquat > 0
                          ? <span className="text-sm font-semibold text-red-600 tabular-nums">{formatCurrency(reliquat)}</span>
                          : <span className="badge bg-green-50 text-green-700">Rien à payer</span>}
                      </td>
                      <td className="table-cell">
                        <p className="text-xs text-gray-700">{formatDate(c.expiryDate)}</p>
                        <p className={cn('text-xs', jl.color)}>{jl.text}</p>
                      </td>
                      <td className="table-cell text-xs text-gray-700">{formatDate(c.echeanceDefinitive)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const detail = reliquat != null && reliquat > 0
                                ? `\n\nLa prime passera à ${formatCurrency(primeDef!)} — reliquat de ${formatCurrency(reliquat)} à encaisser.`
                                : '';
                              if (window.confirm(`Remettre l'attestation définitive à ${clientName(c.client)} ?${detail}`))
                                definitiveMut.mutate(c.id);
                            }}
                            disabled={definitiveMut.isPending}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Appliquer l'échéance et la prime de la période complète"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Remettre la définitive
                          </button>
                          <Link href={`/contrats/${c.id}`} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100" title="Détails">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
