'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, clientName, statusColor, statusLabels, formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Search, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CLAIM_STATUSES = ['DECLARED', 'IN_PROGRESS', 'EXPERTISE', 'CLOSED'];

export default function SinistresPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['claims', { search, status, page }],
    queryFn: () => apiHelper.get<any>('/claims', { search, status, page, limit: 20 }),
  });

  const claims = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? {};

  const statusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) =>
      apiHelper.patch(`/claims/${id}/status`, { status: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['claims'] }); toast.success('Statut mis à jour'); },
    onError: () => toast.error('Erreur'),
  });

  return (
    <div>
      <Header title="Sinistres" />
      <div className="p-6 space-y-5">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4">
          {CLAIM_STATUSES.map((s) => {
            const count = claims.filter((c: any) => c.status === s).length;
            return (
              <button
                key={s}
                onClick={() => { setStatus(status === s ? '' : s); setPage(1); }}
                className={cn(
                  'card text-center transition-all',
                  status === s ? 'ring-2 ring-brand-500' : 'hover:shadow-panel',
                )}
              >
                <p className="text-xs text-gray-500 mb-1">{statusLabels[s]}</p>
                <span className={cn('badge', statusColor[s])}>{statusLabels[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="N° sinistre, client, description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Link href="/sinistres/nouveau" className="btn-primary">
            <Plus className="w-4 h-4" /> Déclarer un sinistre
          </Link>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell">N° Sinistre</th>
                  <th className="table-header-cell">Client</th>
                  <th className="table-header-cell">Contrat</th>
                  <th className="table-header-cell">Compagnie</th>
                  <th className="table-header-cell">Description</th>
                  <th className="table-header-cell">Date sinistre</th>
                  <th className="table-header-cell">Montant estimé</th>
                  <th className="table-header-cell">Indemnité</th>
                  <th className="table-header-cell">Statut</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(10)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-20" /></td>
                  ))}</tr>
                ))}
                {!isLoading && claims.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">Aucun sinistre trouvé</td></tr>
                )}
                {claims.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono text-sm font-medium">{c.claimNumber}</td>
                    <td className="table-cell">
                      <p className="text-sm font-medium">{clientName(c.client)}</p>
                      <p className="text-xs text-gray-400">{c.client?.phone}</p>
                    </td>
                    <td className="table-cell text-xs text-gray-500">{c.contract?.contractNumber}</td>
                    <td className="table-cell text-sm">{c.contract?.company?.name}</td>
                    <td className="table-cell max-w-xs">
                      <p className="text-sm truncate" title={c.description}>{c.description}</p>
                    </td>
                    <td className="table-cell text-xs">{formatDate(c.incidentDate)}</td>
                    <td className="table-cell">{c.estimatedAmount ? formatCurrency(c.estimatedAmount) : '—'}</td>
                    <td className="table-cell">{c.indemnityAmount ? formatCurrency(c.indemnityAmount) : '—'}</td>
                    <td className="table-cell">
                      <span className={cn('badge', statusColor[c.status])}>{statusLabels[c.status]}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <a href={`/sinistres/${c.id}`} className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-brand-50">
                          <Eye className="w-4 h-4" />
                        </a>
                        {c.status !== 'CLOSED' && (
                          <button
                            onClick={() => {
                              const next = CLAIM_STATUSES[CLAIM_STATUSES.indexOf(c.status) + 1];
                              if (next) statusMut.mutate({ id: c.id, s: next });
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                            title="Avancer le statut"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">{meta.total} sinistre{meta.total !== 1 ? 's' : ''} · Page {page} / {meta.totalPages}</p>
              <div className="flex gap-2">
                <button className="btn-secondary py-1.5 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</button>
                <button className="btn-secondary py-1.5 text-xs" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Suivant</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
