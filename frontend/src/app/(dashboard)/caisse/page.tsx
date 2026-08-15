'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Coins, ArrowDownCircle, ArrowUpCircle, Scale, CheckCircle2,
  AlertTriangle, FileDown, Lock, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SOURCE_LABELS: Record<string, string> = {
  ENCAISSEMENT:     'Encaissement',
  VERSEMENT_BANQUE: 'Versement banque',
  RISTOURNE:        'Ristourne',
  CORRECTION:       'Correction',
};

const aujourdhui = () => new Date().toISOString().split('T')[0];

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function CaissePage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(aujourdhui());
  const [comptees, setComptees] = useState('');
  const [notes, setNotes] = useState('');
  const [editionCloture, setEditionCloture] = useState(false);
  const [telechargement, setTelechargement] = useState(false);

  const queryKey = ['caisse', { date }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiHelper.get<any>('/caisse', { date }),
  });

  const j = (data as any)?.data ?? null;
  const mouvements = j?.mouvements ?? [];
  const cloture    = j?.cloture ?? null;

  const clotureMut = useMutation({
    mutationFn: () => apiHelper.post('/caisse/cloture', {
      date,
      especesComptees: Number(comptees),
      notes: notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caisse'] });
      setEditionCloture(false);
      toast.success('Journée clôturée — vous pouvez imprimer l\'arrêté de caisse');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erreur lors de la clôture'));
    },
  });

  async function telechargerArrete() {
    setTelechargement(true);
    try {
      const res = await api.get('/caisse/pdf', { responseType: 'blob', params: { date } });
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href     = url;
      link.download = `arrete-caisse-${date}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors du téléchargement de l'arrêté");
    } finally {
      setTelechargement(false);
    }
  }

  function ouvrirEdition() {
    setComptees(cloture ? String(Number(cloture.especesComptees)) : '');
    setNotes(cloture?.notes ?? '');
    setEditionCloture(true);
  }

  const ecartSaisi = comptees !== '' && j ? Number(comptees) - j.soldeTheorique : null;
  const formulaireVisible = !cloture || editionCloture;

  const kpis = j ? [
    { label: "Solde d'ouverture", value: j.soldeOuverture, icon: Coins,           color: 'text-gray-600 bg-gray-100' },
    { label: 'Entrées du jour',   value: j.totalEntrees,   icon: ArrowDownCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Sorties du jour',   value: j.totalSorties,   icon: ArrowUpCircle,   color: 'text-red-600 bg-red-50' },
    { label: 'Solde théorique',   value: j.soldeTheorique, icon: Scale,           color: 'text-brand-600 bg-brand-50' },
  ] : [];

  return (
    <div>
      <Header title="Caisse" />
      <div className="p-6 space-y-5">

        {/* Date */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="date"
            className="input w-44"
            value={date}
            onChange={(e) => { setDate(e.target.value); setEditionCloture(false); }}
          />
          <button
            onClick={telechargerArrete}
            disabled={telechargement || isLoading}
            className="btn-secondary flex items-center gap-2"
            title="Arrêté de caisse à imprimer et faire signer"
          >
            <FileDown className="w-4 h-4" />
            {telechargement ? 'Génération...' : "Télécharger l'arrêté (PDF)"}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(isLoading ? [...Array(4)] : kpis).map((kpi: any, i: number) => (
            <div key={kpi?.label ?? i} className="card">
              {isLoading ? (
                <div className="animate-pulse bg-gray-100 rounded h-14 w-full" />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{formatCurrency(kpi.value)}</p>
                  </div>
                  <div className={cn('p-2.5 rounded-xl flex-shrink-0 ml-2', kpi.color)}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Clôture */}
        <div className={cn(
          'card border-2',
          cloture && !editionCloture
            ? Math.abs(Number(cloture.ecart)) < 0.005 ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'
            : 'border-gray-200',
        )}>
          {cloture && !editionCloture ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  Math.abs(Number(cloture.ecart)) < 0.005 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100',
                )}>
                  {Math.abs(Number(cloture.ecart)) < 0.005 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    Journée clôturée <Lock className="w-3.5 h-3.5 text-gray-400" />
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Espèces comptées : <strong>{formatCurrency(cloture.especesComptees)}</strong>
                    {cloture.notes && <> · {cloture.notes}</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Écart</p>
                  <p className={cn(
                    'text-xl font-bold tabular-nums',
                    Math.abs(Number(cloture.ecart)) < 0.005 ? 'text-green-600' : 'text-red-600',
                  )}>
                    {Math.abs(Number(cloture.ecart)) < 0.005
                      ? '✓ Juste'
                      : `${Number(cloture.ecart) > 0 ? '+' : ''}${formatCurrency(cloture.ecart)}`}
                  </p>
                </div>
                <button onClick={ouvrirEdition} className="btn-secondary flex items-center gap-2 py-2 text-sm">
                  <Pencil className="w-4 h-4" /> Modifier
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Clôture de la journée</h3>
              <p className="text-xs text-gray-500 mb-4">
                Comptez les espèces du tiroir, saisissez le montant : l&apos;écart avec le solde
                théorique se calcule immédiatement.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="label">Espèces comptées *</label>
                  <div className="relative">
                    <input
                      type="number" step="0.01" min="0" className="input w-44 pr-14" placeholder="0.00"
                      value={comptees}
                      onChange={(e) => setComptees(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">MAD</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Écart</p>
                  <p className={cn(
                    'text-lg font-bold tabular-nums',
                    ecartSaisi === null ? 'text-gray-300'
                      : Math.abs(ecartSaisi) < 0.005 ? 'text-green-600' : 'text-red-600',
                  )}>
                    {ecartSaisi === null ? '—'
                      : Math.abs(ecartSaisi) < 0.005 ? '✓ Juste'
                      : `${ecartSaisi > 0 ? '+' : ''}${formatCurrency(ecartSaisi)}`}
                  </p>
                </div>
                <div className="flex-1 min-w-48">
                  <label className="label">Notes</label>
                  <input
                    type="text" className="input w-full" placeholder="Explication d'un écart, remarque..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (comptees === '' || Number(comptees) < 0) { toast.error('Saisissez les espèces comptées'); return; }
                      clotureMut.mutate();
                    }}
                    disabled={clotureMut.isPending || isLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {clotureMut.isPending ? 'Clôture...' : 'Clôturer la journée'}
                  </button>
                  {editionCloture && (
                    <button onClick={() => setEditionCloture(false)} className="btn-secondary">Annuler</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mouvements */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell w-20">Heure</th>
                  <th className="table-header-cell">Libellé</th>
                  <th className="table-header-cell">Source</th>
                  <th className="table-header-cell">Entrée</th>
                  <th className="table-header-cell">Sortie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, k) => (
                    <td key={k} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-16" /></td>
                  ))}</tr>
                ))}
                {!isLoading && mouvements.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                    Aucun mouvement d&apos;espèces ce jour
                  </td></tr>
                )}
                {mouvements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell text-xs text-gray-500">{heure(m.createdAt)}</td>
                    <td className="table-cell text-sm">{m.libelle}</td>
                    <td className="table-cell">
                      <span className={cn(
                        'badge',
                        m.sens === 'ENTREE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                      )}>
                        {SOURCE_LABELS[m.source] ?? m.source}
                      </span>
                    </td>
                    <td className="table-cell">
                      {m.sens === 'ENTREE'
                        ? <span className="text-sm font-semibold text-green-700 tabular-nums">+ {formatCurrency(m.montant)}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="table-cell">
                      {m.sens === 'SORTIE'
                        ? <span className="text-sm font-semibold text-red-600 tabular-nums">− {formatCurrency(m.montant)}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
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
