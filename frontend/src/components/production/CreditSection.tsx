'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { cn, clientName, formatCurrency, formatDate, insuranceTypeLabels, sousCategorieLabels } from '@/lib/utils';
import { Wallet, Phone, Eye, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface Props {
  companyCode?: string;
  /** Change de valeur après chaque encaissement saisi, pour rafraîchir la section */
  refreshKey?: unknown;
}

export function CreditSection({ companyCode, refreshKey }: Props) {
  const [ouvert, setOuvert] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['credits', { companyCode, refreshKey }],
    queryFn: () => apiHelper.get<any>('/contracts/credits', {
      companyCode: companyCode || undefined,
    }),
  });

  const credits = (data as any)?.data?.credits ?? [];
  const stats   = (data as any)?.data?.stats ?? { count: 0, totalCredit: 0, totalEncaisse: 0, totalDu: 0, clients: 0 };

  const tauxRecouvrement = stats.totalDu > 0
    ? Math.round((stats.totalEncaisse / stats.totalDu) * 100)
    : 0;

  return (
    <div className="card p-0 overflow-hidden">
      {/* En-tête */}
      <button
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'p-2.5 rounded-xl flex-shrink-0',
            stats.count > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50',
          )}>
            {stats.count > 0 ? <Wallet className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              Crédit — restant dû
              {!isLoading && stats.count > 0 && (
                <span className="badge bg-red-50 text-red-700">{stats.count}</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isLoading
                ? 'Chargement...'
                : stats.count === 0
                  ? 'Toutes les primes sont soldées'
                  : `${stats.clients} client${stats.clients > 1 ? 's' : ''} · toutes périodes confondues`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {!isLoading && stats.count > 0 && (
            <div className="text-right">
              <p className="text-xl font-bold text-red-600 tabular-nums">{formatCurrency(stats.totalCredit)}</p>
              <p className="text-xs text-gray-400">{tauxRecouvrement}% déjà encaissé</p>
            </div>
          )}
          {ouvert ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Tableau */}
      {ouvert && (
        <div className="border-t border-gray-100">
          {isLoading ? (
            <div className="px-5 py-6 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded h-4 w-full" />
              ))}
            </div>
          ) : credits.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">
              Aucun impayé — toutes les primes de cette production sont réglées
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header-cell">Client</th>
                    <th className="table-header-cell">Téléphone</th>
                    <th className="table-header-cell">N° Police</th>
                    <th className="table-header-cell">Type</th>
                    <th className="table-header-cell">Prime nette</th>
                    <th className="table-header-cell">Encaissé</th>
                    <th className="table-header-cell">Reste dû</th>
                    <th className="table-header-cell">Souscription</th>
                    <th className="table-header-cell w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {credits.map((c: any) => {
                    const nette = Number(c.primeTTC) - Number(c.reduction);
                    const paye  = Number(c.primePaye);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell">
                          <p className="text-sm font-medium">{clientName(c.client)}</p>
                        </td>
                        <td className="table-cell">
                          {c.client?.phone ? (
                            <a
                              href={`tel:${c.client.phone}`}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                              <Phone className="w-3.5 h-3.5" /> {c.client.phone}
                            </a>
                          ) : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="table-cell font-mono text-xs font-medium text-gray-900">{c.contractNumber}</td>
                        <td className="table-cell text-sm">
                          {insuranceTypeLabels[c.type] ?? c.type}
                          {c.sousCategorie && (
                            <span className="text-gray-400"> · {sousCategorieLabels[c.sousCategorie] ?? c.sousCategorie}</span>
                          )}
                        </td>
                        <td className="table-cell text-sm tabular-nums">{formatCurrency(nette)}</td>
                        <td className="table-cell text-sm tabular-nums">
                          {paye > 0
                            ? <span className="text-green-700 font-medium">{formatCurrency(paye)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="table-cell">
                          <span className="text-sm font-bold text-red-600 tabular-nums">
                            {formatCurrency(c.reste)}
                          </span>
                        </td>
                        <td className="table-cell text-xs text-gray-500">
                          {formatDate(c.souscriptionDate ?? c.createdAt)}
                        </td>
                        <td className="table-cell">
                          <Link
                            href={`/contrats/${c.id}`}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 inline-block"
                            title="Détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="table-cell font-semibold text-sm" colSpan={4}>
                      Total — {stats.count} production{stats.count > 1 ? 's' : ''} non soldée{stats.count > 1 ? 's' : ''}
                    </td>
                    <td className="table-cell font-semibold text-sm tabular-nums">{formatCurrency(stats.totalDu)}</td>
                    <td className="table-cell font-semibold text-sm tabular-nums text-green-700">{formatCurrency(stats.totalEncaisse)}</td>
                    <td className="table-cell font-bold text-sm tabular-nums text-red-600">{formatCurrency(stats.totalCredit)}</td>
                    <td className="table-cell" colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
