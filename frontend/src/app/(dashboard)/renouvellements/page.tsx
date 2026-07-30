'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, clientName, formatCurrency, formatDate, insuranceTypeLabels } from '@/lib/utils';
import {
  Phone, RefreshCw, Target, Clock, CheckCircle2, AlertCircle, Eye,
} from 'lucide-react';
import Link from 'next/link';
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

function daysLabel(expiryDate: string) {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  if (days > 0)  return { text: `Dans ${days} j`, color: 'text-gray-700' };
  if (days === 0) return { text: "Aujourd'hui", color: 'text-orange-600 font-semibold' };
  return { text: `Il y a ${Math.abs(days)} j`, color: 'text-red-600 font-semibold' };
}

export default function RenouvellementsPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [companyCode, setCompanyCode] = useState('');

  const queryKey = ['renewals', { month, companyCode }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiHelper.get<any>('/renewals', { month, companyCode: companyCode || undefined }),
  });

  const stats     = (data as any)?.data?.stats ?? { total: 0, renewed: 0, pending: 0, overdue: 0, rate: 0 };
  const contracts = (data as any)?.data?.contracts ?? [];

  const sorted = [...contracts].sort((a: any, b: any) => {
    const aDone = !!a.renewedTo, bDone = !!b.renewedTo;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  const renewMut = useMutation({
    mutationFn: (id: string) => apiHelper.post(`/contracts/${id}/renew`),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success('Contrat renouvelé'); },
    onError:   () => toast.error('Erreur lors du renouvellement'),
  });

  const kpis = [
    { label: 'Échéances du mois',      value: stats.total,     icon: Clock,        color: 'text-blue-600 bg-blue-50' },
    { label: 'Renouvelés',             value: stats.renewed,   icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { label: 'Non renouvelés',         value: stats.overdue,   icon: AlertCircle,  color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div>
      <Header title="Renouvellements" />
      <div className="p-6 space-y-5">

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            className="input w-44"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <select className="input w-48" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)}>
            {COMPANY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading
                      ? <span className="animate-pulse bg-gray-200 rounded h-7 w-12 inline-block" />
                      : kpi.value}
                  </p>
                </div>
                <div className={cn('p-2.5 rounded-xl flex-shrink-0 ml-2', kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}

          {/* Taux de renouvellement avec barre de progression */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux de renouvellement</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoading
                    ? <span className="animate-pulse bg-gray-200 rounded h-7 w-12 inline-block" />
                    : `${stats.rate}%`}
                </p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0 ml-2 text-teal-600 bg-teal-50">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.rate}%` }}
              />
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
                  <th className="table-header-cell">Prime TTC</th>
                  <th className="table-header-cell">Échéance</th>
                  <th className="table-header-cell">Statut</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-20" /></td>
                  ))}</tr>
                ))}
                {!isLoading && sorted.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">
                    Aucune échéance ce mois-ci
                  </td></tr>
                )}
                {sorted.map((c: any) => {
                  const dl = daysLabel(c.expiryDate);
                  const renewed = !!c.renewedTo;
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
                        <span className="badge bg-blue-50 text-blue-700">{c.company?.code ?? c.company?.name}</span>
                      </td>
                      <td className="table-cell text-sm">{insuranceTypeLabels[c.type] ?? c.type}</td>
                      <td className="table-cell font-semibold text-sm">{formatCurrency(c.primeTTC)}</td>
                      <td className="table-cell">
                        <p className="text-xs text-gray-700">{formatDate(c.expiryDate)}</p>
                        <p className={cn('text-xs', dl.color)}>{dl.text}</p>
                      </td>
                      <td className="table-cell">
                        {renewed
                          ? <span className="badge bg-green-50 text-green-700">Renouvelé</span>
                          : new Date(c.expiryDate) < new Date()
                            ? <span className="badge bg-red-50 text-red-700">Non renouvelé</span>
                            : <span className="badge bg-amber-50 text-amber-700">À relancer</span>}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <Link href={`/contrats/${c.id}`} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100" title="Détails">
                            <Eye className="w-4 h-4" />
                          </Link>
                          {!renewed && (
                            <button
                              onClick={() => renewMut.mutate(c.id)}
                              disabled={renewMut.isPending}
                              className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 disabled:opacity-50"
                              title="Renouveler"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
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
