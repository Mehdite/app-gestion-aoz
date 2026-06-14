'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, clientName, statusColor, statusLabels, formatDate, formatCurrency, insuranceTypeLabels } from '@/lib/utils';
import { Plus, Search, Eye, RefreshCw, Download, Upload, CheckCircle2, XCircle, X, AlertTriangle, Pencil, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'];
const TYPE_OPTIONS   = ['', 'AUTO', 'MOTO', 'HOME', 'HEALTH', 'PROFESSIONAL', 'DECENNIAL', 'TRANSPORT', 'LIFE'];

type ImportResult = { imported: number; errors: string[] };

type EditState = {
  id: string;
  contractNumber: string;
  primeTTC: number;
  reduction: number;
  primePaye: number;
  notes: string;
};

export default function ContratsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type,   setType]   = useState('');
  const [mois,   setMois]   = useState('');
  const [page,   setPage]   = useState(1);

  /* Import state */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  /* Edit state */
  const [editing, setEditing] = useState<EditState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', { search, status, type, mois, page }],
    queryFn:  () => apiHelper.get<any>('/contracts', { search, status, type, mois: mois || undefined, page, limit: 20 }),
  });

  const contracts = (data as any)?.data ?? [];
  const meta      = (data as any)?.meta ?? {};

  const renewMut = useMutation({
    mutationFn: (id: string) => apiHelper.post(`/contracts/${id}/renew`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); toast.success('Renouvelé'); },
    onError:   () => toast.error('Erreur renouvellement'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: any) => apiHelper.put(`/contracts/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Production mise à jour');
      setEditing(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  /* ── Télécharger le modèle Excel ── */
  async function downloadTemplate() {
    try {
      const res  = await api.get('/contracts/template', { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href     = url;
      link.download = 'modele_import_production.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur téléchargement du modèle');
    }
  }

  /* ── Importer un fichier Excel ── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.post('/contracts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result: ImportResult = res.data?.data ?? res.data;
      setImportResult(result);
      if (result.imported > 0) {
        qc.invalidateQueries({ queryKey: ['contracts'] });
        qc.invalidateQueries({ queryKey: ['clients-all'] });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  }

  /* Ouvrir le panneau d'édition */
  function openEdit(c: any) {
    setEditing({
      id:             c.id,
      contractNumber: c.contractNumber,
      primeTTC:       Number(c.primeTTC)  || 0,
      reduction:      Number(c.reduction) || 0,
      primePaye:      Number(c.primePaye) || 0,
      notes:          c.notes ?? '',
    });
  }

  /* Calcul du reste dans le formulaire d'édition */
  const resteEditing = editing
    ? Math.max(0, editing.primeTTC - editing.reduction - editing.primePaye)
    : 0;

  /* ================================================================ */
  return (
    <div>
      <Header title="Suivi de production" />
      <div className="p-6 space-y-5">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="N° contrat, client..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
            <select className="input w-44" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Tous types</option>
              {TYPE_OPTIONS.filter(Boolean).map((t) => (
                <option key={t} value={t}>{insuranceTypeLabels[t]}</option>
              ))}
            </select>
            <input
              type="month"
              className="input w-44"
              value={mois}
              onChange={(e) => { setMois(e.target.value); setPage(1); }}
              title="Filtrer par mois d'effet"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2" title="Télécharger le fichier Excel vierge">
              <Download className="w-4 h-4" /> Modèle Excel
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="btn-secondary flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importation...' : 'Importer'}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <Link href="/contrats/nouveau" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Saisir une production
            </Link>
          </div>
        </div>

        {/* ── Résultat import ── */}
        {importResult && (
          <div className={cn(
            'rounded-xl border p-4 flex items-start gap-3',
            importResult.errors.length === 0 ? 'bg-green-50 border-green-200'
              : importResult.imported > 0    ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
          )}>
            <div className="flex-shrink-0 mt-0.5">
              {importResult.errors.length === 0
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : importResult.imported > 0
                  ? <AlertTriangle className="w-5 h-5 text-amber-600" />
                  : <XCircle className="w-5 h-5 text-red-600" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">
                {importResult.imported > 0
                  ? `✅ ${importResult.imported} production${importResult.imported > 1 ? 's' : ''} importée${importResult.imported > 1 ? 's' : ''} avec succès`
                  : 'Aucune ligne importée'}
                {importResult.errors.length > 0 && ` — ${importResult.errors.length} erreur${importResult.errors.length > 1 ? 's' : ''}`}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-start gap-1"><span className="mt-0.5">•</span> {e}</li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Tableau ── */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header-cell">N° Police</th>
                  <th className="table-header-cell">Client</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Prime TTC</th>
                  <th className="table-header-cell">Réduction</th>
                  <th className="table-header-cell">Encaissement réel</th>
                  <th className="table-header-cell">Reste client</th>
                  <th className="table-header-cell">Date effet</th>
                  <th className="table-header-cell">Échéance</th>
                  <th className="table-header-cell">Statut</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(11)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-20" /></td>
                  ))}</tr>
                ))}
                {!isLoading && contracts.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400 text-sm">
                    Aucune production enregistrée
                  </td></tr>
                )}
                {contracts.map((c: any) => {
                  const ttc   = Number(c.primeTTC)  || 0;
                  const reduc = Number(c.reduction) || 0;
                  const paye  = Number(c.primePaye) || 0;
                  const reste = Math.max(0, ttc - reduc - paye);
                  const isEditing = editing?.id === c.id;
                  return (
                    <>
                      <tr key={c.id} className={cn('hover:bg-gray-50 transition-colors', isEditing && 'bg-brand-50')}>
                        <td className="table-cell font-mono text-xs font-medium text-gray-900">{c.contractNumber}</td>
                        <td className="table-cell">
                          <p className="text-sm font-medium">{clientName(c.client)}</p>
                          <p className="text-xs text-gray-400">{c.client?.phone}</p>
                        </td>
                        <td className="table-cell">
                          <span className="badge bg-blue-50 text-blue-700">{insuranceTypeLabels[c.type]}</span>
                        </td>
                        <td className="table-cell font-semibold text-sm">{formatCurrency(ttc)}</td>
                        <td className="table-cell text-sm">
                          {reduc > 0 ? formatCurrency(reduc) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="table-cell">
                          {paye > 0
                            ? <span className="text-sm font-medium text-green-700">{formatCurrency(paye)}</span>
                            : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="table-cell">
                          {reste > 0
                            ? <span className="text-sm font-semibold text-red-600">{formatCurrency(reste)}</span>
                            : <span className="badge bg-green-50 text-green-700">Soldé</span>}
                        </td>
                        <td className="table-cell text-xs">{formatDate(c.effectiveDate)}</td>
                        <td className="table-cell">
                          <p className={cn('text-xs font-medium', new Date(c.expiryDate) < new Date() ? 'text-red-600' : 'text-gray-700')}>
                            {formatDate(c.expiryDate)}
                          </p>
                        </td>
                        <td className="table-cell">
                          <span className={cn('badge', statusColor[c.status])}>{statusLabels[c.status]}</span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => isEditing ? setEditing(null) : openEdit(c)}
                              className={cn(
                                'p-1.5 rounded transition-colors',
                                isEditing
                                  ? 'text-brand-600 bg-brand-100'
                                  : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50'
                              )}
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <Link href={`/contrats/${c.id}`} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100" title="Détails">
                              <Eye className="w-4 h-4" />
                            </Link>
                            {c.status === 'ACTIVE' && (
                              <button onClick={() => renewMut.mutate(c.id)} className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50" title="Renouveler">
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Panneau d'édition inline ── */}
                      {isEditing && editing && (
                        <tr key={`edit-${c.id}`}>
                          <td colSpan={11} className="bg-brand-50 border-b border-brand-100 px-4 py-4">
                            <div className="flex flex-wrap items-end gap-4">
                              {/* Info non modifiable */}
                              <div>
                                <p className="text-xs text-gray-500 mb-1">N° Police</p>
                                <p className="text-sm font-mono font-semibold text-gray-800">{editing.contractNumber}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Prime TTC</p>
                                <p className="text-sm font-semibold text-gray-800">{formatCurrency(editing.primeTTC)}</p>
                              </div>

                              {/* Réduction */}
                              <div>
                                <label className="text-xs text-gray-600 font-medium mb-1 block">Réduction (MAD)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input w-32 text-sm"
                                  value={editing.reduction}
                                  onChange={e => setEditing(p => p && ({ ...p, reduction: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>

                              {/* Encaissement réel */}
                              <div>
                                <label className="text-xs text-gray-600 font-medium mb-1 block">Encaissement réel (MAD)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input w-36 text-sm"
                                  value={editing.primePaye}
                                  onChange={e => setEditing(p => p && ({ ...p, primePaye: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>

                              {/* Reste calculé */}
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Reste client</p>
                                <p className={cn('text-sm font-bold', resteEditing > 0 ? 'text-red-600' : 'text-green-600')}>
                                  {resteEditing > 0 ? formatCurrency(resteEditing) : '✓ Soldé'}
                                </p>
                              </div>

                              {/* Notes */}
                              <div className="flex-1 min-w-48">
                                <label className="text-xs text-gray-600 font-medium mb-1 block">Notes</label>
                                <input
                                  type="text"
                                  className="input text-sm w-full"
                                  value={editing.notes}
                                  onChange={e => setEditing(p => p && ({ ...p, notes: e.target.value }))}
                                  placeholder="Remarque..."
                                />
                              </div>

                              {/* Boutons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateMut.mutate({
                                    id:        editing.id,
                                    reduction: editing.reduction,
                                    primePaye: editing.primePaye,
                                    notes:     editing.notes || undefined,
                                  })}
                                  disabled={updateMut.isPending}
                                  className="btn-primary flex items-center gap-2 py-2 text-sm"
                                >
                                  <Save className="w-4 h-4" />
                                  {updateMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                                <button
                                  onClick={() => setEditing(null)}
                                  className="btn-secondary py-2 text-sm"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">{meta.total} production{meta.total !== 1 ? 's' : ''} · Page {page} / {meta.totalPages}</p>
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
