'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { formatCurrency, formatDate, clientName, statusLabels, insuranceTypeLabels } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#1A73E8', '#D42B2B', '#059669', '#D97706', '#7C3AED', '#0891B2'];

export default function RapportsPage() {
  const [tab, setTab] = useState<'contracts' | 'commissions' | 'claims'>('contracts');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const year = new Date().getFullYear();

  /* ── toutes les queries chargent dès l'ouverture de la page ── */
  const { data: contractsData, isLoading: loadingContracts } = useQuery({
    queryKey: ['report-contracts', startDate, endDate],
    queryFn: () => apiHelper.get<any>('/reports/contracts', {
      ...(startDate ? { startDate } : {}),
      ...(endDate   ? { endDate }   : {}),
    }),
  });

  const { data: commissionsData, isLoading: loadingCommissions } = useQuery({
    queryKey: ['report-commissions', year],
    queryFn: () => apiHelper.get<any>('/reports/commissions', { year }),
  });

  const { data: claimsData, isLoading: loadingClaims } = useQuery({
    queryKey: ['report-claims', startDate, endDate],
    queryFn: () => apiHelper.get<any>('/reports/claims', {
      ...(startDate ? { startDate } : {}),
      ...(endDate   ? { endDate }   : {}),
    }),
  });

  const contracts      = (contractsData as any)?.data ?? [];
  const summary        = (contractsData as any)?.meta?.summary ?? {};
  const commissions    = (commissionsData as any)?.data ?? [];
  const claims         = (claimsData as any)?.data ?? [];
  const claimsByStatus = (claimsData as any)?.meta?.byStatus ?? [];

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate)   params.set('endDate', endDate);
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    window.open(`${base}/reports/contracts/excel?${params.toString()}`, '_blank');
  };

  return (
    <div>
      <Header title="Rapports & Analyses" />
      <div className="p-6 space-y-6">

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            { key: 'contracts',   label: 'Contrats' },
            { key: 'commissions', label: 'Commissions' },
            { key: 'claims',      label: 'Sinistres' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === key ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filtres dates */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Du</label>
            <input type="date" className="input w-40" value={startDate}
              onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Au</label>
            <input type="date" className="input w-40" value={endDate}
              onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {tab === 'contracts' && (
            <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Excel
            </button>
          )}
        </div>

        {/* ─── Onglet Contrats ─── */}
        {tab === 'contracts' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-xs text-gray-400 uppercase mb-1">Contrats</p>
                {loadingContracts
                  ? <div className="animate-pulse h-8 bg-gray-100 rounded w-16 mx-auto" />
                  : <p className="text-2xl font-bold">{summary.count ?? 0}</p>}
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-400 uppercase mb-1">Prime TTC totale</p>
                {loadingContracts
                  ? <div className="animate-pulse h-8 bg-gray-100 rounded w-32 mx-auto" />
                  : <p className="text-2xl font-bold text-brand-600">{formatCurrency(summary.totalPrimeTTC)}</p>}
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-400 uppercase mb-1">Taxes totales</p>
                {loadingContracts
                  ? <div className="animate-pulse h-8 bg-gray-100 rounded w-24 mx-auto" />
                  : <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalTaxes)}</p>}
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header-cell">N° Police</th>
                    <th className="table-header-cell">Client</th>
                    <th className="table-header-cell">Compagnie</th>
                    <th className="table-header-cell">Type</th>
                    <th className="table-header-cell">Prime TTC</th>
                    <th className="table-header-cell">Date effet</th>
                    <th className="table-header-cell">Échéance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingContracts && [...Array(5)].map((_, i) => (
                    <tr key={i}>{[...Array(7)].map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="animate-pulse bg-gray-100 rounded h-4 w-20" />
                      </td>
                    ))}</tr>
                  ))}
                  {!loadingContracts && contracts.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                      Aucun contrat trouvé
                    </td></tr>
                  )}
                  {contracts.slice(0, 100).map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-xs font-medium">{c.contractNumber}</td>
                      <td className="table-cell text-sm">{clientName(c.client)}</td>
                      <td className="table-cell text-sm">{c.company?.name}</td>
                      <td className="table-cell">
                        <span className="badge bg-blue-50 text-blue-700">{insuranceTypeLabels[c.type] ?? c.type}</span>
                      </td>
                      <td className="table-cell font-semibold">{formatCurrency(c.primeTTC)}</td>
                      <td className="table-cell text-xs">{formatDate(c.effectiveDate)}</td>
                      <td className="table-cell text-xs">{formatDate(c.expiryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Onglet Commissions ─── */}
        {tab === 'commissions' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="card text-center">
                <p className="text-xs text-gray-400 uppercase mb-1">Commission brute {year}</p>
                <p className="text-2xl font-bold text-brand-600">
                  {formatCurrency(commissions.reduce((s: number, m: any) => s + Number(m.gross ?? 0), 0))}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-400 uppercase mb-1">Commission nette {year}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(commissions.reduce((s: number, m: any) => s + Number(m.net ?? 0), 0))}
                </p>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-4 font-medium text-gray-800">Commissions mensuelles — {year}</h3>
              {loadingCommissions
                ? <div className="animate-pulse h-64 bg-gray-50 rounded" />
                : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={commissions} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Bar dataKey="gross" name="Commission brute" fill="#E8F0FB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net"   name="Commission nette" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>
        )}

        {/* ─── Onglet Sinistres ─── */}
        {tab === 'claims' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="mb-4 font-medium text-gray-800">Sinistres par statut</h3>
                {loadingClaims
                  ? <div className="animate-pulse h-52 bg-gray-50 rounded" />
                  : claimsByStatus.length === 0
                    ? <p className="text-center text-gray-400 text-sm py-10">Aucun sinistre</p>
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={claimsByStatus}
                            dataKey="_count"
                            nameKey="status"
                            cx="50%" cy="50%"
                            outerRadius={80}
                            label={({ status, percent }: any) =>
                              `${statusLabels[status] ?? status} ${(percent * 100).toFixed(0)}%`}
                          >
                            {claimsByStatus.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
              </div>

              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-header-cell">N° Sinistre</th>
                      <th className="table-header-cell">Client</th>
                      <th className="table-header-cell">Date</th>
                      <th className="table-header-cell">Indemnité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingClaims && [...Array(3)].map((_, i) => (
                      <tr key={i}>{[...Array(4)].map((_, j) => (
                        <td key={j} className="table-cell">
                          <div className="animate-pulse bg-gray-100 rounded h-4 w-20" />
                        </td>
                      ))}</tr>
                    ))}
                    {!loadingClaims && claims.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                        Aucun sinistre
                      </td></tr>
                    )}
                    {claims.slice(0, 20).map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="table-cell font-mono text-sm">{c.claimNumber}</td>
                        <td className="table-cell text-sm">{clientName(c.client)}</td>
                        <td className="table-cell text-xs">{formatDate(c.incidentDate)}</td>
                        <td className="table-cell">{c.indemnityAmount ? formatCurrency(c.indemnityAmount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
