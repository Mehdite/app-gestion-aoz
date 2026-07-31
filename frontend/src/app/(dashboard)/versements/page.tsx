'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus, Trash2, Landmark, ArrowLeftRight, Wallet, Scale, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_LABELS: Record<string, string> = {
  VERSEMENT: 'Versement',
  VIREMENT:  'Virement reçu',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function VersementsPage() {
  const qc = useQueryClient();
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [filtreType, setFiltreType] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    type: 'VERSEMENT',
    montant: '',
    date: todayStr(),
    reference: '',
    banque: '',
    notes: '',
  });

  const queryKey = ['versements', { annee, filtreType }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiHelper.get<any>('/versements', { annee, type: filtreType || undefined }),
  });

  const versements    = (data as any)?.data?.versements ?? [];
  const stats         = (data as any)?.data?.stats ?? { count: 0, totalVersement: 0, totalVirement: 0, totalBanque: 0 };
  const rapprochement = (data as any)?.data?.rapprochement ?? { primesEncaissees: 0, totalRistournes: 0, attendu: 0, totalBanque: 0, ecart: 0 };

  const createMut = useMutation({
    mutationFn: () => apiHelper.post('/versements', {
      type:      form.type,
      montant:   Number(form.montant),
      date:      form.date,
      reference: form.reference || undefined,
      banque:    form.banque || undefined,
      notes:     form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Ligne enregistrée');
      setForm({ type: form.type, montant: '', date: todayStr(), reference: '', banque: form.banque, notes: '' });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiHelper.delete(`/versements/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success('Ligne supprimée'); },
    onError:   () => toast.error('Erreur lors de la suppression'),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(form.montant);
    if (!m || m <= 0) { toast.error('Montant requis'); return; }
    createMut.mutate();
  }

  const ecartNul = Math.abs(rapprochement.ecart) < 0.01;

  const kpis = [
    { label: 'Versements',    value: stats.totalVersement, icon: Landmark,       color: 'text-blue-600 bg-blue-50' },
    { label: 'Virements',     value: stats.totalVirement,  icon: ArrowLeftRight, color: 'text-purple-600 bg-purple-50' },
    { label: 'Total banque',  value: stats.totalBanque,    icon: Wallet,         color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div>
      <Header title="Versements & virements" />
      <div className="p-6 space-y-5">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <select className="input w-32" value={annee} onChange={(e) => setAnnee(e.target.value)}>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select className="input w-44" value={filtreType} onChange={(e) => setFiltreType(e.target.value)}>
              <option value="">Tous types</option>
              <option value="VERSEMENT">Versements</option>
              <option value="VIREMENT">Virements reçus</option>
            </select>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> {showForm ? 'Masquer le formulaire' : 'Nouvelle ligne'}
          </button>
        </div>

        {/* Formulaire de saisie rapide */}
        {showForm && (
          <form onSubmit={onSubmit} className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Nouvelle opération</h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Type *</label>
                <select
                  className="input w-40"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="VERSEMENT">Versement</option>
                  <option value="VIREMENT">Virement reçu</option>
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  type="date" className="input w-40"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Montant *</label>
                <div className="relative">
                  <input
                    type="number" step="0.01" min="0" className="input w-36 pr-14" placeholder="0.00"
                    value={form.montant}
                    onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">MAD</span>
                </div>
              </div>
              <div>
                <label className="label">Banque</label>
                <input
                  type="text" className="input w-36" placeholder="Ex: BMCE"
                  value={form.banque}
                  onChange={(e) => setForm((f) => ({ ...f, banque: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Référence</label>
                <input
                  type="text" className="input w-40" placeholder="N° bordereau..."
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </div>
              <div className="flex-1 min-w-40">
                <label className="label">Notes</label>
                <input
                  type="text" className="input w-full" placeholder="Remarque..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={createMut.isPending} className="btn-primary">
                {createMut.isPending ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </form>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading
                      ? <span className="animate-pulse bg-gray-200 rounded h-7 w-24 inline-block" />
                      : formatCurrency(kpi.value)}
                  </p>
                </div>
                <div className={cn('p-2.5 rounded-xl flex-shrink-0 ml-2', kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rapprochement annuel */}
        <div className={cn(
          'card border-2',
          isLoading ? 'border-gray-100' : ecartNul ? 'border-green-200 bg-green-50/40' : 'border-amber-200 bg-amber-50/40',
        )}>
          <div className="flex items-start gap-3 mb-4">
            <div className={cn(
              'p-2 rounded-lg flex-shrink-0',
              ecartNul ? 'text-green-600 bg-green-100' : 'text-amber-600 bg-amber-100',
            )}>
              {ecartNul ? <CheckCircle2 className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Rapprochement {annee}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Comparaison cumulée sur l&apos;année — une facilité accordée un mois peut être encaissée un autre
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Primes encaissées</p>
              <p className="font-semibold text-gray-900 tabular-nums">{formatCurrency(rapprochement.primesEncaissees)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Ristournes remboursées</p>
              <p className="font-semibold text-red-600 tabular-nums">− {formatCurrency(rapprochement.totalRistournes)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Attendu en banque</p>
              <p className="font-semibold text-gray-900 tabular-nums">{formatCurrency(rapprochement.attendu)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Écart</p>
              <p className={cn(
                'font-bold tabular-nums',
                ecartNul ? 'text-green-600' : rapprochement.ecart < 0 ? 'text-red-600' : 'text-amber-600',
              )}>
                {ecartNul ? '✓ Équilibré' : `${rapprochement.ecart > 0 ? '+' : ''}${formatCurrency(rapprochement.ecart)}`}
              </p>
            </div>
          </div>

          {!isLoading && !ecartNul && (
            <div className="flex items-start gap-2 mt-4 pt-4 border-t border-amber-200/60 text-xs text-gray-600">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p>
                {rapprochement.ecart < 0
                  ? `Il manque ${formatCurrency(Math.abs(rapprochement.ecart))} en banque par rapport aux primes encaissées.`
                  : `${formatCurrency(rapprochement.ecart)} de plus en banque que les primes encaissées enregistrées.`}
              </p>
            </div>
          )}
        </div>

        {/* Tableau */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Montant</th>
                  <th className="table-header-cell">Banque</th>
                  <th className="table-header-cell">Référence</th>
                  <th className="table-header-cell">Notes</th>
                  <th className="table-header-cell w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-20" /></td>
                  ))}</tr>
                ))}
                {!isLoading && versements.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                    Aucune opération enregistrée en {annee}
                  </td></tr>
                )}
                {versements.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell text-xs">{formatDate(v.date)}</td>
                    <td className="table-cell">
                      <span className={cn(
                        'badge',
                        v.type === 'VERSEMENT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700',
                      )}>
                        {TYPE_LABELS[v.type] ?? v.type}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-sm tabular-nums">{formatCurrency(v.montant)}</td>
                    <td className="table-cell text-sm">{v.banque || <span className="text-gray-300">—</span>}</td>
                    <td className="table-cell text-xs font-mono">{v.reference || <span className="text-gray-300 font-sans">—</span>}</td>
                    <td className="table-cell text-xs text-gray-500 max-w-48 truncate" title={v.notes ?? ''}>
                      {v.notes || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => {
                          if (window.confirm(`Supprimer cette ligne de ${formatCurrency(v.montant)} ?`))
                            deleteMut.mutate(v.id);
                        }}
                        disabled={deleteMut.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
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
