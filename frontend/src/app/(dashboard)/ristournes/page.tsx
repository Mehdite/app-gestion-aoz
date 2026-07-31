'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { clientName, formatCurrency, formatDate, insuranceTypeLabels } from '@/lib/utils';
import { Plus, Search, Trash2, Undo2, Receipt, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

const COMPANY_OPTIONS = [
  { value: '',           label: 'Toutes compagnies' },
  { value: 'AXA',        label: 'AXA' },
  { value: 'CAT',        label: 'CAT' },
  { value: 'COVER_EDGE', label: 'Cover Edge' },
];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function RistournesPage() {
  const qc = useQueryClient();
  const [mois, setMois] = useState(currentMonth());
  const [companyCode, setCompanyCode] = useState('');
  const [search, setSearch] = useState('');

  const queryKey = ['ristournes', { mois, companyCode, search }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiHelper.get<any>('/ristournes', {
      mois: mois || undefined,
      companyCode: companyCode || undefined,
      search: search || undefined,
    }),
  });

  const ristournes = (data as any)?.data?.ristournes ?? [];
  const stats      = (data as any)?.data?.stats ?? { count: 0, total: 0 };

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiHelper.delete(`/ristournes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Ristourne annulée — la production redevient active');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div>
      <Header title="Ristournes" />
      <div className="p-6 space-y-5">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-52 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="N° police, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input
              type="month"
              className="input w-44"
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              title="Filtrer par mois de la ristourne"
            />
            <select className="input w-48" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)}>
              {COMPANY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Link href="/ristournes/nouvelle" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Saisir une ristourne
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total ristourné</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {isLoading
                    ? <span className="animate-pulse bg-gray-200 rounded h-7 w-24 inline-block" />
                    : `− ${formatCurrency(stats.total)}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Déduit du CA de ce mois</p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0 ml-2 text-red-600 bg-red-50">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoading
                    ? <span className="animate-pulse bg-gray-200 rounded h-7 w-10 inline-block" />
                    : stats.count}
                </p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0 ml-2 text-blue-600 bg-blue-50">
                <Hash className="w-5 h-5" />
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
                  <th className="table-header-cell">N° Police</th>
                  <th className="table-header-cell">Compagnie</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Prime initiale</th>
                  <th className="table-header-cell">Ristourne</th>
                  <th className="table-header-cell">Date d&apos;effet</th>
                  <th className="table-header-cell">Motif</th>
                  <th className="table-header-cell w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-20" /></td>
                  ))}</tr>
                ))}
                {!isLoading && ristournes.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">
                    Aucune ristourne ce mois-ci
                  </td></tr>
                )}
                {ristournes.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <p className="text-sm font-medium">{clientName(r.contract?.client)}</p>
                      <p className="text-xs text-gray-400">{r.contract?.client?.phone}</p>
                    </td>
                    <td className="table-cell font-mono text-xs font-medium text-gray-900">
                      {r.contract?.contractNumber}
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-blue-50 text-blue-700">{r.contract?.company?.code}</span>
                    </td>
                    <td className="table-cell text-sm">
                      {insuranceTypeLabels[r.contract?.type] ?? r.contract?.type}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {formatCurrency(r.contract?.primeTTC)}
                    </td>
                    <td className="table-cell font-semibold text-sm text-red-600">
                      − {formatCurrency(r.montant)}
                    </td>
                    <td className="table-cell text-xs">{formatDate(r.dateEffet)}</td>
                    <td className="table-cell text-xs text-gray-500 max-w-40 truncate" title={r.motif ?? ''}>
                      {r.motif || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => {
                          if (window.confirm(`Annuler cette ristourne de ${formatCurrency(r.montant)} ?\n\nLa production ${r.contract?.contractNumber} redeviendra active.`))
                            deleteMut.mutate(r.id);
                        }}
                        disabled={deleteMut.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title="Annuler la ristourne"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
