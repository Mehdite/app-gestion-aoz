'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, clientName, statusColor, statusLabels, formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Search, Filter, Eye, Edit, Archive, Trash2, Phone, Mail, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { ClientModal } from './ClientModal';

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, type, status, page }],
    queryFn: () => apiHelper.get<any>('/clients', { search, type, status, page, limit: 20 }),
  });

  const clients = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? {};

  const archiveMut = useMutation({
    mutationFn: (id: string) => apiHelper.patch(`/clients/${id}/archive`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client archivé'); },
    onError: () => toast.error('Erreur lors de l\'archivage'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiHelper.delete(`/clients/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div>
      <Header title="Clients" />
      <div className="p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Rechercher par nom, CIN, téléphone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="input w-40" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Tous types</option>
              <option value="INDIVIDUAL">Particulier</option>
              <option value="COMPANY">Entreprise</option>
            </select>
            <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
          </div>
          <button className="btn-primary" onClick={() => { setSelected(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell">Client</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Contact</th>
                  <th className="table-header-cell">Ville</th>
                  <th className="table-header-cell">Contrats</th>
                  <th className="table-header-cell">Statut</th>
                  <th className="table-header-cell">Inscrit le</th>
                  <th className="table-header-cell w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="table-cell">
                          <div className="animate-pulse bg-gray-100 rounded h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {!isLoading && clients.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">Aucun client trouvé</td></tr>
                )}
                {clients.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                          c.type === 'COMPANY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700',
                        )}>
                          {c.type === 'COMPANY'
                            ? <Building2 className="w-4 h-4" />
                            : `${c.firstName?.[0] ?? ''}${c.lastName?.[0] ?? ''}`}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{clientName(c)}</p>
                          <p className="text-xs text-gray-400">{c.clientNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge', c.type === 'COMPANY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                        {c.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{c.phone}</p>
                      {c.email && <p className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{c.email}</p>}
                    </td>
                    <td className="table-cell text-sm">{c.city ?? '—'}</td>
                    <td className="table-cell">
                      <span className="font-semibold">{c._count?.contracts ?? 0}</span>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge', statusColor[c.status])}>{statusLabels[c.status]}</span>
                    </td>
                    <td className="table-cell text-xs text-gray-400">{formatDate(c.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <a href={`/clients/${c.id}`} className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-brand-50">
                          <Eye className="w-4 h-4" />
                        </a>
                        <button onClick={() => { setSelected(c); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-brand-50">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => archiveMut.mutate(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Supprimer le client "${clientName(c)}" ? Cette action est irréversible.`)) deleteMut.mutate(c.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {meta.total} client{meta.total !== 1 ? 's' : ''} · Page {page} / {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary py-1.5 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Précédent
                </button>
                <button className="btn-secondary py-1.5 text-xs" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ClientModal
          client={selected}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['clients'] }); }}
        />
      )}
    </div>
  );
}
