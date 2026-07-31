'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Pencil, Save, Repeat, Wallet, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'SALAIRE', label: 'Salaires',  color: 'bg-blue-50 text-blue-700' },
  { value: 'LOYER',   label: 'Loyer',     color: 'bg-purple-50 text-purple-700' },
  { value: 'FACTURE', label: 'Factures',  color: 'bg-amber-50 text-amber-700' },
  { value: 'ACHAT',   label: 'Achats',    color: 'bg-teal-50 text-teal-700' },
  { value: 'AUTRE',   label: 'Autre',     color: 'bg-gray-100 text-gray-600' },
];

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
const catColor = (v: string) => CATEGORIES.find((c) => c.value === v)?.color ?? 'bg-gray-100 text-gray-600';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type EditState = { id: string; libelle: string; montant: string; categorie: string; isRecurrent: boolean };

export default function ChargesPage() {
  const qc = useQueryClient();
  const [mois, setMois] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);

  const [form, setForm] = useState({
    categorie: 'FACTURE',
    libelle: '',
    montant: '',
    isRecurrent: false,
  });

  const queryKey = ['charges', { mois }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiHelper.get<any>('/charges', { mois }),
  });

  const charges = (data as any)?.data?.charges ?? [];
  const stats   = (data as any)?.data?.stats ?? { count: 0, total: 0, parCategorie: [] };

  const createMut = useMutation({
    mutationFn: () => apiHelper.post('/charges', {
      mois,
      categorie:   form.categorie,
      libelle:     form.libelle.trim(),
      montant:     Number(form.montant),
      isRecurrent: form.isRecurrent,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success(form.isRecurrent ? 'Charge récurrente ajoutée — elle se reportera chaque mois' : 'Charge ajoutée');
      setForm({ categorie: form.categorie, libelle: '', montant: '', isRecurrent: false });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const updateMut = useMutation({
    mutationFn: (e: EditState) => apiHelper.put(`/charges/${e.id}`, {
      libelle:     e.libelle.trim(),
      montant:     Number(e.montant),
      categorie:   e.categorie,
      isRecurrent: e.isRecurrent,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Charge mise à jour');
      setEditing(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiHelper.delete(`/charges/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success('Charge supprimée'); },
    onError:   () => toast.error('Erreur lors de la suppression'),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.libelle.trim()) { toast.error('Libellé requis'); return; }
    const m = Number(form.montant);
    if (!m || m <= 0) { toast.error('Montant requis'); return; }
    createMut.mutate();
  }

  return (
    <div>
      <Header title="Charges de l'agence" />
      <div className="p-6 space-y-5">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="month"
            className="input w-44"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
          />
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> {showForm ? 'Masquer le formulaire' : 'Ajouter une charge'}
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <form onSubmit={onSubmit} className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Nouvelle charge</h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Catégorie *</label>
                <select
                  className="input w-40"
                  value={form.categorie}
                  onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="label">Libellé *</label>
                <input
                  type="text" className="input w-full" placeholder="Ex: Salaire Fatima, Facture ONEE..."
                  value={form.libelle}
                  onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
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
              <label className="flex items-center gap-2.5 cursor-pointer pb-2.5">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded"
                  checked={form.isRecurrent}
                  onChange={(e) => setForm((f) => ({ ...f, isRecurrent: e.target.checked }))}
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-gray-400" /> Récurrente
                </span>
              </label>
              <button type="submit" disabled={createMut.isPending} className="btn-primary">
                {createMut.isPending ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Une charge <strong>récurrente</strong> (salaire, loyer) se reporte automatiquement sur les mois
              suivants — le montant reste modifiable mois par mois pour les charges variables.
            </p>
          </form>
        )}

        {/* Total + répartition */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total des charges</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  {isLoading
                    ? <span className="animate-pulse bg-gray-200 rounded h-7 w-28 inline-block" />
                    : formatCurrency(stats.total)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{stats.count} ligne{stats.count !== 1 ? 's' : ''}</p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0 ml-2 text-red-600 bg-red-50">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="card md:col-span-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Répartition par catégorie</p>
            {isLoading ? (
              <div className="animate-pulse bg-gray-100 rounded h-8 w-full" />
            ) : stats.parCategorie.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune charge ce mois-ci</p>
            ) : (
              <div className="space-y-2">
                {stats.parCategorie.map((c: any) => {
                  const pct = stats.total > 0 ? Math.round((c.total / stats.total) * 100) : 0;
                  return (
                    <div key={c.categorie} className="flex items-center gap-3">
                      <span className={cn('badge w-24 justify-center flex-shrink-0', catColor(c.categorie))}>
                        {catLabel(c.categorie)}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 tabular-nums w-28 text-right">
                        {formatCurrency(c.total)}
                      </span>
                      <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tableau */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell">Catégorie</th>
                  <th className="table-header-cell">Libellé</th>
                  <th className="table-header-cell">Montant</th>
                  <th className="table-header-cell w-28">Récurrente</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-24" /></td>
                  ))}</tr>
                ))}
                {!isLoading && charges.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                    Aucune charge enregistrée pour ce mois
                  </td></tr>
                )}
                {charges.map((c: any) => {
                  const isEditing = editing?.id === c.id;
                  return isEditing ? (
                    <tr key={c.id} className="bg-brand-50">
                      <td className="table-cell">
                        <select
                          className="input w-36 text-sm"
                          value={editing.categorie}
                          onChange={(e) => setEditing((p) => p && ({ ...p, categorie: e.target.value }))}
                        >
                          {CATEGORIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                      </td>
                      <td className="table-cell">
                        <input
                          type="text" className="input text-sm w-full"
                          value={editing.libelle}
                          onChange={(e) => setEditing((p) => p && ({ ...p, libelle: e.target.value }))}
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="number" step="0.01" min="0" className="input w-32 text-sm"
                          value={editing.montant}
                          onChange={(e) => setEditing((p) => p && ({ ...p, montant: e.target.value }))}
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="checkbox" className="w-4 h-4 rounded"
                          checked={editing.isRecurrent}
                          onChange={(e) => setEditing((p) => p && ({ ...p, isRecurrent: e.target.checked }))}
                        />
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateMut.mutate(editing)}
                            disabled={updateMut.isPending}
                            className="p-1.5 text-brand-600 hover:bg-brand-100 rounded disabled:opacity-50"
                            title="Enregistrer"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                            title="Annuler"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <span className={cn('badge', catColor(c.categorie))}>{catLabel(c.categorie)}</span>
                      </td>
                      <td className="table-cell text-sm font-medium">{c.libelle}</td>
                      <td className="table-cell font-semibold text-sm tabular-nums">{formatCurrency(c.montant)}</td>
                      <td className="table-cell">
                        {c.isRecurrent
                          ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                              <Repeat className="w-3.5 h-3.5" /> Oui
                            </span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditing({
                              id: c.id,
                              libelle: c.libelle,
                              montant: String(Number(c.montant)),
                              categorie: c.categorie,
                              isRecurrent: c.isRecurrent,
                            })}
                            className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-brand-50"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Supprimer "${c.libelle}" ?`)) deleteMut.mutate(c.id);
                            }}
                            disabled={deleteMut.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
