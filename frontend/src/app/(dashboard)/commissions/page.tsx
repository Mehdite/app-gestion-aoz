'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommissionsPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState('');
  const [isPaid, setIsPaid] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const year = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['commissions', { period, isPaid, page }],
    queryFn: () => apiHelper.get<any>('/commissions', {
      period, page, limit: 20,
      ...(isPaid !== '' ? { isPaid: isPaid === 'true' } : {}),
    }),
  });

  const { data: report } = useQuery({
    queryKey: ['commissions-report', year],
    queryFn: () => apiHelper.get<any>('/commissions/report', { year }),
  });

  const commissions = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? {};
  const summary = (data as any)?.meta?.summary ?? {};
  const monthlyData = (report as any)?.data ?? [];

  const markPaidMut = useMutation({
    mutationFn: () => apiHelper.post('/commissions/mark-paid', { ids: selected }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] });
      qc.invalidateQueries({ queryKey: ['commissions-report'] });
      setSelected([]);
      toast.success('Commissions marquées comme payées');
    },
    onError: () => toast.error('Erreur'),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div>
      <Header title="Commissions" />
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Commission brute</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.gross)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Commission nette</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.net)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Entrées</p>
            <p className="text-2xl font-bold text-gray-900">{meta.total ?? 0}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="card">
          <h3 className="mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Commissions par mois — {year}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="net" name="Commission nette" fill="#D97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="month"
              className="input w-44"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            <select className="input w-40" value={isPaid} onChange={(e) => setIsPaid(e.target.value)}>
              <option value="">Tous</option>
              <option value="false">Non payées</option>
              <option value="true">Payées</option>
            </select>
          </div>
          {selected.length > 0 && (
            <button className="btn-primary" onClick={() => markPaidMut.mutate()}>
              <CheckSquare className="w-4 h-4" />
              Marquer payées ({selected.length})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header-cell w-8">
                  <input type="checkbox"
                    onChange={(e) => setSelected(e.target.checked ? commissions.map((c: any) => c.id) : [])}
                    checked={selected.length === commissions.length && commissions.length > 0}
                  />
                </th>
                <th className="table-header-cell">N° Quittance</th>
                <th className="table-header-cell">Contrat</th>
                <th className="table-header-cell">Compagnie</th>
                <th className="table-header-cell">Agent</th>
                <th className="table-header-cell">Période</th>
                <th className="table-header-cell">Prime HT</th>
                <th className="table-header-cell">Taux</th>
                <th className="table-header-cell">Commission brute</th>
                <th className="table-header-cell">Commission nette</th>
                <th className="table-header-cell">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(10)].map((_, j) => (
                  <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-20" /></td>
                ))}</tr>
              ))}
              {!isLoading && commissions.length === 0 && (
                <tr><td colSpan={11} className="text-center py-8 text-gray-400 text-sm">Aucune commission</td></tr>
              )}
              {commissions.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                  </td>
                  <td className="table-cell font-mono text-xs">{c.numQuittance ?? <span className="text-gray-300">—</span>}</td>
                  <td className="table-cell font-mono text-sm">{c.contract?.contractNumber}</td>
                  <td className="table-cell text-sm">{c.company?.name}</td>
                  <td className="table-cell text-sm">{c.agent?.firstName} {c.agent?.lastName}</td>
                  <td className="table-cell font-medium">{c.period}</td>
                  <td className="table-cell">{formatCurrency(c.primeHT)}</td>
                  <td className="table-cell">{Number(c.rate).toFixed(1)}%</td>
                  <td className="table-cell">{formatCurrency(c.grossAmount)}</td>
                  <td className="table-cell font-semibold text-green-700">{formatCurrency(c.netAmount)}</td>
                  <td className="table-cell">
                    <span className={cn('badge', c.isPaid ? 'badge-active' : 'badge-warning')}>
                      {c.isPaid ? 'Payée' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">{meta.total} commission{meta.total !== 1 ? 's' : ''} · Page {page} / {meta.totalPages}</p>
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
