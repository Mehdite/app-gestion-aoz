'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, statusColor, statusLabels, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Phone, Mail, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['NEW', 'CONTACTED', 'QUOTE_SENT', 'WON', 'LOST'];

export default function ProspectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: pipeline } = useQuery({
    queryKey: ['prospects-pipeline'],
    queryFn: () => apiHelper.get<any[]>('/prospects/pipeline'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['prospects', { search, filterStatus }],
    queryFn: () => apiHelper.get<any>('/prospects', { search, status: filterStatus }),
  });

  const prospects = (data as any)?.data ?? [];
  const pipelineData = (pipeline as any)?.data ?? [];

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiHelper.patch(`/prospects/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prospects'] }); qc.invalidateQueries({ queryKey: ['prospects-pipeline'] }); toast.success('Statut mis à jour'); },
    onError: () => toast.error('Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiHelper.delete(`/prospects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prospects'] }); qc.invalidateQueries({ queryKey: ['prospects-pipeline'] }); toast.success('Prospect supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const pipelineColors: Record<string, string> = {
    NEW: 'bg-blue-50 border-blue-200 text-blue-700',
    CONTACTED: 'bg-amber-50 border-amber-200 text-amber-700',
    QUOTE_SENT: 'bg-purple-50 border-purple-200 text-purple-700',
    WON: 'bg-green-50 border-green-200 text-green-700',
    LOST: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div>
      <Header title="Prospects & CRM" />
      <div className="p-6 space-y-6">
        {/* Pipeline */}
        <div className="grid grid-cols-5 gap-3">
          {STATUSES.map((s) => {
            const item = pipelineData.find((p: any) => p.status === s);
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                className={cn('card text-center border transition-all hover:shadow-panel', pipelineColors[s], filterStatus === s && 'ring-2 ring-offset-1 ring-current')}
              >
                <p className="text-2xl font-bold">{item?.count ?? 0}</p>
                <p className="text-xs font-medium mt-1">{statusLabels[s]}</p>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            className="input max-w-xs"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link href="/prospects/nouveau" className="btn-primary">
            <Plus className="w-4 h-4" /> Nouveau prospect
          </Link>
        </div>

        {/* Cards Kanban */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && [...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse h-32 bg-gray-100" />
          ))}
          {prospects.map((p: any) => (
            <div key={p.id} className="card hover:shadow-panel transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{p.firstName} {p.lastName}</p>
                  {p.company && <p className="text-xs text-gray-400">{p.company}</p>}
                </div>
                <span className={cn('badge', statusColor[p.status])}>{statusLabels[p.status]}</span>
              </div>
              <div className="space-y-1 mb-3">
                <p className="text-xs flex items-center gap-1 text-gray-500">
                  <Phone className="w-3 h-3" />{p.phone}
                </p>
                {p.email && <p className="text-xs flex items-center gap-1 text-gray-500"><Mail className="w-3 h-3" />{p.email}</p>}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Créé {formatDate(p.createdAt)}</p>
                <div className="flex items-center gap-2">
                  {p.status !== 'WON' && p.status !== 'LOST' && STATUSES.indexOf(p.status) < STATUSES.length - 2 && (
                    <button
                      onClick={() => statusMut.mutate({ id: p.id, status: STATUSES[STATUSES.indexOf(p.status) + 1] })}
                      className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700"
                    >
                      Avancer <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => { if (window.confirm(`Supprimer "${p.firstName} ${p.lastName}" ? Cette action est irréversible.`)) deleteMut.mutate(p.id); }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && prospects.length === 0 && (
            <div className="col-span-3 text-center py-10 text-gray-400 text-sm">Aucun prospect trouvé</div>
          )}
        </div>
      </div>
    </div>
  );
}
