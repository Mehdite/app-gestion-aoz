'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import {
  Search, Upload, CheckCircle, AlertCircle,
  X, TrendingUp, Banknote, Building2, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/* Constantes                                                           */
/* ------------------------------------------------------------------ */

const MOIS_OPTIONS = [
  { value: '0126', label: 'Janvier 2026' },
  { value: '0226', label: 'Février 2026' },
  { value: '0326', label: 'Mars 2026' },
  { value: '0426', label: 'Avril 2026' },
  { value: '0526', label: 'Mai 2026' },
  { value: '0626', label: 'Juin 2026' },
  { value: '0726', label: 'Juillet 2026' },
  { value: '0826', label: 'Août 2026' },
  { value: '0926', label: 'Septembre 2026' },
  { value: '1026', label: 'Octobre 2026' },
  { value: '1126', label: 'Novembre 2026' },
  { value: '1226', label: 'Décembre 2026' },
];

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', AUTRE: 'Autre',
};

type ImportResult = { imported: number; skipped: number; errors: string[] };

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function QuittancesPage() {
  const qc = useQueryClient();

  /* Filtres liste */
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('IMPAYE');
  const [moisFilter, setMoisFilter] = useState('');
  const [page,       setPage]       = useState(1);

  /* Import */
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [importMois, setImportMois] = useState('');
  const [importing,  setImporting]  = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  /* Règlement individuel en cours */
  const [encaissingId, setEncaissingId] = useState<string | null>(null);

  /* Tout régler à AXA */
  const reglerToutMut = useMutation({
    mutationFn: () => apiHelper.patch('/quittances/reglerTout', {}),
    onSuccess: (res: any) => {
      const d = (res as any)?.data ?? res;
      qc.invalidateQueries({ queryKey: ['quittances'] });
      toast.success(`${d.reglees} quittance${d.reglees > 1 ? 's' : ''} marquée${d.reglees > 1 ? 's' : ''} comme réglées à AXA`);
    },
    onError: () => toast.error('Erreur'),
  });

  /* Alimentation */
  const [alimentResult, setAlimentResult] = useState<any | null>(null);
  const alimentMut = useMutation({
    mutationFn: () => apiHelper.post('/quittances/alimenter'),
    onSuccess: (res: any) => {
      const d = (res as any)?.data ?? res;
      setAlimentResult(d);
      qc.invalidateQueries({ queryKey: ['quittances'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
      toast.success(`${d.clients} clients · ${d.contracts} contrats · ${d.commissions} commissions créés`);
    },
    onError: () => toast.error('Erreur lors de l\'alimentation'),
  });

  /* ---- Requête liste ---- */
  const { data, isLoading } = useQuery({
    queryKey: ['quittances', { search, status, moisFilter, page }],
    queryFn: () => apiHelper.get<any>('/quittances', {
      search: search || undefined,
      status: status || undefined,
      moisImport: moisFilter || undefined,
      page,
      limit: 30,
    }),
  });

  const quittances = (data as any)?.data          ?? [];
  const meta       = (data as any)?.meta          ?? {};
  const totaux     = meta?.totaux                 ?? { primeTotale: 0, commission: 0, netCie: 0 };

  /* ---- Mutation encaissement ---- */
  const encaisserMut = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      apiHelper.patch(`/quittances/${id}/encaisser`, { method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quittances'] });
      toast.success('Quittance encaissée');
      setEncaissingId(null);
    },
    onError: () => toast.error('Erreur lors de l\'encaissement'),
  });

  /* ---- Import fichier AXA ---- */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!importMois) {
      toast.error('Sélectionnez le mois correspondant avant d\'importer');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('moisImport', importMois);

    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.post('/quittances/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result: ImportResult = res.data?.data ?? res.data;
      setImportResult(result);
      if (result.imported > 0) {
        qc.invalidateQueries({ queryKey: ['quittances'] });
        setMoisFilter(importMois);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  }

  const moisLabel = (code: string) =>
    MOIS_OPTIONS.find(m => m.value === code)?.label ?? code;

  /* ================================================================= */
  return (
    <div>
      <Header title="Quittances Impayées" />
      <div className="p-6 space-y-5">

        {/* ── Import ── */}
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-gray-700">Importer un fichier AXA</p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input w-44"
              value={importMois}
              onChange={e => setImportMois(e.target.value)}
            >
              <option value="">— Sélectionner le mois —</option>
              {MOIS_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing || !importMois}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                importing || !importMois
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              )}
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importation...' : 'Charger le fichier Excel AXA'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-gray-400">Fichier : "Liste des quittances impayés MMAA.xlsx"</p>
          </div>

          {/* Tout régler à AXA */}
          <div className="border-t border-gray-100 pt-3 flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm('Marquer toutes les quittances impayées comme réglées à AXA ?'))
                  reglerToutMut.mutate();
              }}
              disabled={reglerToutMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {reglerToutMut.isPending ? 'En cours...' : 'Tout régler à AXA'}
            </button>
            <p className="text-xs text-gray-400">Marque toutes les quittances "Non réglé à AXA" comme réglées en une seule action</p>
          </div>

          {/* Bouton alimentation */}
          <div className="border-t border-gray-100 pt-3 flex items-center gap-3">
            <button
              onClick={() => alimentMut.mutate()}
              disabled={alimentMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', alimentMut.isPending && 'animate-spin')} />
              {alimentMut.isPending ? 'Alimentation en cours...' : 'Alimenter Clients · Production · Commissions'}
            </button>
            <p className="text-xs text-gray-400">
              Crée automatiquement les clients, contrats et commissions à partir des quittances importées
            </p>
          </div>

          {/* Résultat alimentation */}
          {alimentResult && (
            <div className="rounded-lg bg-brand-50 border border-brand-200 p-3 flex items-start gap-3">
              <div className="flex-1 text-sm text-brand-800">
                <p className="font-medium">
                  ✅ {alimentResult.clients} client{alimentResult.clients !== 1 ? 's' : ''} ·{' '}
                  {alimentResult.contracts} contrat{alimentResult.contracts !== 1 ? 's' : ''} ·{' '}
                  {alimentResult.commissions} commission{alimentResult.commissions !== 1 ? 's' : ''} créés
                </p>
                {alimentResult.errors?.length > 0 && (
                  <p className="text-xs text-amber-700 mt-1">{alimentResult.errors.length} erreur(s) ignorée(s)</p>
                )}
              </div>
              <button onClick={() => setAlimentResult(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Résultat import */}
          {importResult && (
            <div className={cn(
              'rounded-lg border p-3 flex items-start gap-3',
              importResult.errors.length === 0
                ? 'bg-green-50 border-green-200'
                : importResult.imported > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
            )}>
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-800">
                  {importResult.imported > 0
                    ? `✅ ${importResult.imported} quittance${importResult.imported > 1 ? 's' : ''} importée${importResult.imported > 1 ? 's' : ''}`
                    : 'Aucune ligne importée'}
                  {importResult.skipped > 0 && ` — ${importResult.skipped} déjà existante${importResult.skipped > 1 ? 's' : ''} (ignorées)`}
                  {importResult.errors.length > 0 && ` — ${importResult.errors.length} erreur${importResult.errors.length > 1 ? 's' : ''}`}
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <li key={i} className="text-xs text-red-700">• {e}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-xs text-red-500">... et {importResult.errors.length - 5} autre(s)</li>
                    )}
                  </ul>
                )}
              </div>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Cartes totaux ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Banknote className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Prime Totale</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totaux.primeTotale)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Commission</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totaux.commission)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Net AXA</p>
              <p className="text-lg font-bold text-brand-600">{formatCurrency(totaux.netCie)}</p>
            </div>
          </div>
        </div>

        {/* ── Filtres ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Assuré, N° police, N° quittance..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tous statuts</option>
            <option value="IMPAYE">Non réglé à AXA</option>
            <option value="ENCAISSE">Réglé à AXA</option>
          </select>
          <select className="input w-40" value={moisFilter} onChange={e => { setMoisFilter(e.target.value); setPage(1); }}>
            <option value="">Tous les mois</option>
            {MOIS_OPTIONS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {(search || status !== 'IMPAYE' || moisFilter) && (
            <button
              className="text-xs text-gray-400 hover:text-gray-600 underline"
              onClick={() => { setSearch(''); setStatus('IMPAYE'); setMoisFilter(''); setPage(1); }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* ── Tableau ── */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell">Mois</th>
                  <th className="table-header-cell">N° Police</th>
                  <th className="table-header-cell">N° Quittance</th>
                  <th className="table-header-cell">Assuré</th>
                  <th className="table-header-cell">Branche</th>
                  <th className="table-header-cell">Date Effet</th>
                  <th className="table-header-cell">Expiration</th>
                  <th className="table-header-cell text-right">Prime TTC</th>
                  <th className="table-header-cell text-right">Commission</th>
                  <th className="table-header-cell text-right">Net AXA</th>
                  <th className="table-header-cell">Statut</th>
                  <th className="table-header-cell w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(12)].map((_, j) => (
                    <td key={j} className="table-cell">
                      <div className="animate-pulse bg-gray-100 rounded h-4 w-20" />
                    </td>
                  ))}</tr>
                ))}

                {!isLoading && quittances.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-14 text-gray-400 text-sm">
                      Aucune quittance — importez un fichier AXA pour commencer
                    </td>
                  </tr>
                )}

                {quittances.map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <span className="badge bg-gray-100 text-gray-600 text-xs">{moisLabel(q.moisImport)}</span>
                    </td>
                    <td className="table-cell font-mono text-xs text-gray-700 whitespace-nowrap">{q.numPolice}</td>
                    <td className="table-cell font-mono text-xs font-semibold text-gray-900">{q.numQuittance}</td>
                    <td className="table-cell">
                      <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{q.assure}</p>
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-blue-50 text-blue-700 text-xs">{q.branche}</span>
                    </td>
                    <td className="table-cell text-xs text-gray-600 whitespace-nowrap">{formatDate(q.dateEffet)}</td>
                    <td className="table-cell text-xs text-gray-600 whitespace-nowrap">{formatDate(q.dateExpiration)}</td>
                    <td className="table-cell text-right font-semibold text-sm text-gray-900 whitespace-nowrap">
                      {formatCurrency(Number(q.primeTotale))}
                    </td>
                    <td className="table-cell text-right text-sm text-green-700 whitespace-nowrap">
                      {formatCurrency(Number(q.commission))}
                    </td>
                    <td className="table-cell text-right text-sm text-brand-600 whitespace-nowrap">
                      {formatCurrency(Number(q.netCie))}
                    </td>
                    <td className="table-cell">
                      {q.status === 'IMPAYE' ? (
                        <span className="badge bg-red-50 text-red-700 flex items-center gap-1 w-fit whitespace-nowrap">
                          <AlertCircle className="w-3 h-3" /> Non réglé à AXA
                        </span>
                      ) : (
                        <div>
                          <span className="badge bg-green-50 text-green-700 flex items-center gap-1 w-fit whitespace-nowrap">
                            <CheckCircle className="w-3 h-3" /> Réglé à AXA
                          </span>
                          {q.paidAt && (
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(q.paidAt)}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      {q.status === 'IMPAYE' && (
                        encaissingId === q.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              id={`m-${q.id}`}
                              className="input text-xs py-1 w-28"
                              defaultValue="CASH"
                            >
                              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const sel = document.getElementById(`m-${q.id}`) as HTMLSelectElement;
                                encaisserMut.mutate({ id: q.id, method: sel?.value ?? 'CASH' });
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Confirmer"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEncaissingId(null)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEncaissingId(q.id)}
                            className="btn-secondary py-1 px-2 text-xs text-green-700 border-green-300 hover:bg-green-50 flex items-center gap-1 whitespace-nowrap"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Régler à AXA
                          </button>
                        )
                      )}
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
                {meta.total} quittance{meta.total !== 1 ? 's' : ''} · Page {page} / {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary py-1.5 text-xs"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Précédent
                </button>
                <button
                  className="btn-secondary py-1.5 text-xs"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
