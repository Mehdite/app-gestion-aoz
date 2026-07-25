'use client';

import { useQuery } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { formatCurrency, formatDate, clientName, statusColor, statusLabels } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import {
  Users, FileCheck, AlertTriangle, TrendingUp, Banknote, Clock, Target,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiHelper.get<any>('/dashboard'),
    refetchInterval: 60000,
  });

  const stats         = data?.data?.kpis ?? {};
  const revenue       = data?.data?.revenuByMonth ?? [];
  const recentContracts = data?.data?.recentContracts ?? [];
  const recentClaims    = data?.data?.recentClaims ?? [];

  const kpis = [
    {
      label: 'Clients actifs',
      value: stats.totalClients ?? 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Contrats actifs',
      value: stats.activeContracts ?? 0,
      icon: FileCheck,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'CA du mois',
      value: formatCurrency(stats.monthRevenue ?? 0),
      icon: Banknote,
      color: 'text-purple-600 bg-purple-50',
      sub: `Encaissé : ${formatCurrency(stats.monthEncaissement ?? 0)}`,
    },
    {
      label: 'CA total',
      value: formatCurrency(stats.totalCA ?? 0),
      icon: TrendingUp,
      color: 'text-brand-600 bg-brand-50',
      sub: `Reste : ${formatCurrency(stats.totalReste ?? 0)}`,
    },
    {
      label: 'Échéances 30j',
      value: stats.expiringContracts ?? 0,
      icon: Clock,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Sinistres ouverts',
      value: stats.openClaims ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
    {
      label: 'Taux conversion',
      value: `${stats.conversionRate ?? 0}%`,
      icon: Target,
      color: 'text-teal-600 bg-teal-50',
    },
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
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading
                      ? <span className="animate-pulse bg-gray-200 rounded h-7 w-16 inline-block" />
                      : kpi.value}
                  </p>
                  {kpi.sub && !isLoading && (
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                  )}
                </div>
                <div className={cn('p-2.5 rounded-xl flex-shrink-0 ml-2', kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart CA */}
        <div className="card">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            CA mensuel — Primes TTC vs Encaissements (MAD)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1A73E8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="encGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16A34A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue"      name="Prime TTC" stroke="#1A73E8" fill="url(#revGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="encaissement" name="Encaissé"  stroke="#16A34A" fill="url(#encGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Récents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Contrats récents */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                <FileCheck className="w-4 h-4 text-green-600" />
                Productions récentes
              </h3>
              <Link href="/contrats" className="text-xs text-brand-600 hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-2">
              {recentContracts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune production récente</p>
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

          {/* Sinistres récents */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 font-semibold text-gray-800">
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
