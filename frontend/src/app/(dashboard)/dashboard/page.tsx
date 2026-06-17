'use client';

import { useQuery } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { formatCurrency, formatDate, clientName, statusColor, statusLabels } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import {
  Users, FileCheck, AlertTriangle, TrendingUp, Banknote, Clock, Target, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiHelper.get<any>('/dashboard'),
    refetchInterval: 60000,
  });

  const stats = data?.data?.kpis ?? {};
  const revenue = data?.data?.revenuByMonth ?? [];
  const recentContracts = data?.data?.recentContracts ?? [];
  const recentClaims = data?.data?.recentClaims ?? [];

  const kpis = [
    { label: 'Clients actifs', value: stats.totalClients ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50', change: null },
    { label: 'Contrats actifs', value: stats.activeContracts ?? 0, icon: FileCheck, color: 'text-green-600 bg-green-50', change: null },
    { label: 'Sinistres ouverts', value: stats.openClaims ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50', change: null },
    { label: 'CA du mois', value: formatCurrency(stats.monthRevenue), icon: Banknote, color: 'text-purple-600 bg-purple-50', change: null },
    { label: 'Commissions', value: formatCurrency(stats.monthCommissions), icon: TrendingUp, color: 'text-amber-600 bg-amber-50', change: null },
    { label: 'Écheances 30j', value: stats.expiringContracts ?? 0, icon: Clock, color: 'text-orange-600 bg-orange-50', change: null },
    { label: 'Total sinistres', value: stats.totalClaims ?? 0, icon: AlertTriangle, color: 'text-gray-600 bg-gray-50', change: null },
    { label: 'Taux conversion', value: `${stats.conversionRate ?? 0}%`, icon: Target, color: 'text-teal-600 bg-teal-50', change: null },
  ];

  return (
    <div>
      <Header title="Tableau de bord" />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading ? <span className="animate-pulse bg-gray-200 rounded h-7 w-16 inline-block" /> : kpi.value}
                  </p>
                </div>
                <div className={cn('p-2.5 rounded-xl', kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue chart */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              Chiffre d'affaires mensuel (MAD)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#1A73E8" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Commissions chart */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-500" />
              Commissions mensuelles (MAD)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="commissions" fill="#D97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent contracts */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-green-600" />
                Contrats récents
              </h3>
              <Link href="/contrats" className="text-xs text-brand-600 hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-2">
              {recentContracts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun contrat récent</p>
              )}
              {recentContracts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{clientName(c.client)}</p>
                    <p className="text-xs text-gray-400">{c.contractNumber} · {c.company?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(c.primeTTC)}</p>
                    <span className={cn('badge', statusColor[c.status])}>{statusLabels[c.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent claims */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Sinistres récents
              </h3>
              <Link href="/sinistres" className="text-xs text-brand-600 hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-2">
              {recentClaims.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun sinistre récent</p>
              )}
              {recentClaims.map((cl: any) => (
                <div key={cl.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{clientName(cl.client)}</p>
                    <p className="text-xs text-gray-400">{cl.claimNumber} · {formatDate(cl.incidentDate)}</p>
                  </div>
                  <span className={cn('badge', statusColor[cl.status])}>{statusLabels[cl.status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
