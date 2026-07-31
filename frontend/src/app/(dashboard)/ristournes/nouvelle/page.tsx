'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, clientName, formatCurrency, formatDate, insuranceTypeLabels } from '@/lib/utils';
import { ArrowLeft, Search, CheckCircle2, Info, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

const MOTIFS = [
  'Véhicule vendu',
  'Véhicule volé',
  'Double assurance',
  'Résiliation client',
  'Autre',
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** Prorata du reliquat non consommé, au jour près */
function prorata(primeTTC: number, effectiveDate: string, expiryDate: string, dateEffet: string) {
  const debut = new Date(effectiveDate).getTime();
  const fin   = new Date(expiryDate).getTime();
  const arret = new Date(dateEffet).getTime();
  if (!primeTTC || fin <= debut) return 0;
  const total   = fin - debut;
  const restant = Math.max(0, fin - Math.max(arret, debut));
  return Math.round((primeTTC * restant / total) * 100) / 100;
}

export default function NouvelleRistournePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [contract, setContract] = useState<any>(null);

  const [montant, setMontant]     = useState('');
  const [dateEffet, setDateEffet] = useState(todayStr());
  const [motif, setMotif]         = useState(MOTIFS[0]);
  const [notes, setNotes]         = useState('');

  const { data: searchData } = useQuery({
    queryKey: ['contracts-search-ristourne', search],
    queryFn: () => apiHelper.get<any>('/contracts', { search, status: 'ACTIVE', limit: 8 }),
    enabled: search.trim().length >= 2,
  });

  const results = (searchData as any)?.data ?? [];

  const suggestion = contract
    ? prorata(Number(contract.primeTTC), contract.effectiveDate, contract.expiryDate, dateEffet)
    : 0;

  const mutation = useMutation({
    mutationFn: () => apiHelper.post('/ristournes', {
      contractId: contract.id,
      montant:    Number(montant),
      dateEffet,
      motif,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ristournes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Ristourne enregistrée — la production a été annulée');
      router.push('/ristournes');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg ?? "Erreur lors de l'enregistrement"));
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contract) { toast.error('Veuillez sélectionner une production'); return; }
    const m = Number(montant);
    if (!m || m <= 0) { toast.error('Montant de la ristourne requis'); return; }
    if (m > Number(contract.primeTTC)) {
      toast.error('La ristourne ne peut pas dépasser la prime initiale');
      return;
    }
    mutation.mutate();
  }

  return (
    <div>
      <Header title="Saisir une ristourne" />
      <div className="p-6">
        <button onClick={() => router.push('/ristournes')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 max-w-2xl">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            La ristourne se déduit du CA du mois de <strong>sa date d&apos;effet</strong>, pas du mois de la
            production d&apos;origine. La production sélectionnée sera automatiquement annulée.
          </p>
        </div>

        <form onSubmit={onSubmit} className="max-w-2xl space-y-5">

          {/* Production concernée */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Production concernée</h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Rechercher par n° police ou nom du client..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowDrop(true); setContract(null); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                autoComplete="off"
              />
              {showDrop && results.length > 0 && (
                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                  {results.map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-3 py-2.5 text-left hover:bg-brand-50 border-b border-gray-50 last:border-0"
                      onMouseDown={() => {
                        setContract(c);
                        setSearch(`${c.contractNumber} — ${clientName(c.client)}`);
                        setShowDrop(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-gray-900">{clientName(c.client)}</span>
                        <span className="font-mono text-xs text-gray-400">{c.contractNumber}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                        <span>{insuranceTypeLabels[c.type] ?? c.type}</span>
                        <span>{formatCurrency(c.primeTTC)}</span>
                        <span>échéance {formatDate(c.expiryDate)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDrop && search.trim().length >= 2 && results.length === 0 && (
                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-3 py-3 text-sm text-gray-400">
                  Aucune production active trouvée
                </div>
              )}
            </div>

            {contract && (
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm flex-1">
                  <p className="font-semibold text-gray-900">{clientName(contract.client)}</p>
                  <div className="text-gray-500 text-xs mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <span>Police : <strong className="font-mono">{contract.contractNumber}</strong></span>
                    <span>Prime TTC : <strong>{formatCurrency(contract.primeTTC)}</strong></span>
                    <span>Effet : {formatDate(contract.effectiveDate)}</span>
                    <span>Échéance : {formatDate(contract.expiryDate)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Montant et date */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Ristourne</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date d&apos;effet de la ristourne *</label>
                <input
                  type="date"
                  className="input"
                  value={dateEffet}
                  onChange={(e) => setDateEffet(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Détermine le mois de déduction du CA</p>
              </div>
              <div>
                <label className="label">Montant à rembourser *</label>
                <div className="relative">
                  <input
                    type="number" step="0.01" min="0"
                    className="input pr-16"
                    placeholder="0.00"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">MAD</span>
                </div>
              </div>
            </div>

            {contract && suggestion > 0 && (
              <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <Calculator className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-700">
                      Reliquat au prorata : <strong className="text-amber-700">{formatCurrency(suggestion)}</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Calculé au jour près sur la période restante — ajustez si votre barème diffère
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMontant(String(suggestion))}
                  className="btn-secondary py-1.5 text-xs whitespace-nowrap"
                >
                  Utiliser
                </button>
              </div>
            )}

            <div>
              <label className="label">Motif</label>
              <select className="input" value={motif} onChange={(e) => setMotif(e.target.value)}>
                {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                rows={2}
                className="input"
                placeholder="Précisions éventuelles..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push('/ristournes')} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !contract}
              className={cn('btn-primary', (!contract || mutation.isPending) && 'opacity-50 cursor-not-allowed')}
            >
              {mutation.isPending ? 'Enregistrement...' : 'Enregistrer la ristourne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
