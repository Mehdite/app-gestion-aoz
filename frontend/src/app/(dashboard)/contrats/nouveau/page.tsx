'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import toast from 'react-hot-toast';
import { ArrowLeft, Info, UserPlus, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Schéma production                                                    */
/* ------------------------------------------------------------------ */
const schema = z.object({
  contractNumber: z.string().optional(),
  type:           z.string().min(1, 'Type requis'),
  clientId:       z.string().optional(),
  primeTTC:       z.coerce.number().positive('Prime TTC requise'),
  reduction:      z.coerce.number().min(0).default(0),
  primePaye:      z.coerce.number().min(0).default(0),
  frequency:      z.string().min(1),
  effectiveDate:  z.string().min(1, "Date d'effet requise"),
  expiryDate:     z.string().min(1),
  notes:          z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/* ------------------------------------------------------------------ */
/* Constantes                                                           */
/* ------------------------------------------------------------------ */
const TYPES = [
  { value: 'AUTO',         label: 'Automobile' },
  { value: 'MOTO',         label: 'Moto' },
  { value: 'HOME',         label: 'Habitation' },
  { value: 'HEALTH',       label: 'Santé' },
  { value: 'PROFESSIONAL', label: 'Multirisque Pro' },
  { value: 'DECENNIAL',    label: 'Décennale' },
  { value: 'TRANSPORT',    label: 'Transport' },
  { value: 'LIFE',         label: 'Vie' },
  { value: 'OTHER',        label: 'Autre' },
];

const FREQUENCIES = [
  { value: 'ANNUAL',      label: 'Annuelle' },
  { value: 'SEMI_ANNUAL', label: 'Semestrielle' },
  { value: 'QUARTERLY',   label: 'Trimestrielle' },
  { value: 'MONTHLY',     label: 'Mensuelle' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function addOneYear(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

function fmt(n: number) {
  return n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ================================================================== */
/* Page                                                                 */
/* ================================================================== */
export default function SaisirProductionPage() {
  const router = useRouter();

  /* ---------- données externes ---------- */
  const { data: clientsData } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => apiHelper.get<any>('/clients', { limit: 500 }),
  });
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiHelper.get<any>('/companies'),
  });
  const clients   = (clientsData  as any)?.data ?? [];
  const companies = (companiesData as any)?.data ?? [];
  const axaId     = companies[0]?.id ?? '';

  /* ---------- mode client ---------- */
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');

  /* ---------- formulaire nouveau client ---------- */
  const [nc, setNc] = useState({
    type:        'INDIVIDUAL' as 'INDIVIDUAL' | 'COMPANY',
    firstName:   '',
    lastName:    '',
    companyName: '',
    phone:       '',
    cin:         '',
    ice:         '',
    email:       '',
    city:        '',
  });
  const [ncErrors, setNcErrors] = useState<Record<string, string>>({});

  /* ---------- formulaire production ---------- */
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { frequency: 'ANNUAL', reduction: 0, primePaye: 0 },
  });

  const primeTTC      = Number(watch('primeTTC'))  || 0;
  const reduction     = Number(watch('reduction')) || 0;
  const primePaye     = Number(watch('primePaye')) || 0;
  const effectiveDate = watch('effectiveDate');
  const clientId      = watch('clientId');

  const primeNette  = Math.max(0, primeTTC - reduction);
  const resteAPayer = Math.max(0, primeNette - primePaye);

  const selectedClient = clients.find((c: any) => c.id === clientId);

  /* ---------- auto-calcul échéance ---------- */
  useEffect(() => {
    if (effectiveDate) setValue('expiryDate', addOneYear(effectiveDate));
  }, [effectiveDate, setValue]);

  /* ---------- validation nouveau client ---------- */
  function validateNewClient() {
    const errs: Record<string, string> = {};
    if (nc.type === 'INDIVIDUAL') {
      if (!nc.firstName.trim())  errs.firstName = 'Prénom requis';
      if (!nc.lastName.trim())   errs.lastName  = 'Nom requis';
    } else {
      if (!nc.companyName.trim()) errs.companyName = 'Raison sociale requise';
    }
    if (!nc.phone.trim() || nc.phone.trim().length < 10) errs.phone = 'Téléphone requis (10 chiffres min)';
    setNcErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ---------- mutations ---------- */
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let resolvedClientId = data.clientId;

      /* Créer le client si nouveau */
      if (clientMode === 'new') {
        const clientPayload: any = {
          type:  nc.type,
          phone: nc.phone.trim(),
        };
        if (nc.type === 'INDIVIDUAL') {
          clientPayload.firstName = nc.firstName.trim();
          clientPayload.lastName  = nc.lastName.trim();
          if (nc.cin.trim())   clientPayload.cin   = nc.cin.trim();
        } else {
          clientPayload.companyName = nc.companyName.trim();
          if (nc.ice.trim())   clientPayload.ice   = nc.ice.trim();
        }
        if (nc.email.trim()) clientPayload.email = nc.email.trim();
        if (nc.city.trim())  clientPayload.city  = nc.city.trim();

        const res = await apiHelper.post<any>('/clients', clientPayload);
        resolvedClientId = (res as any).data?.id ?? (res as any).id;
      }

      if (!resolvedClientId) throw new Error('Client introuvable');

      return apiHelper.post('/contracts', {
        ...data,
        clientId:  resolvedClientId,
        companyId: axaId,
        primeHT:   data.primeTTC,
        taxes:     0,
        autoRenew: false,
      });
    },
    onSuccess: () => {
      toast.success('Production enregistrée' + (clientMode === 'new' ? ' — nouveau client créé' : ''));
      router.push('/contrats');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Erreur lors de l'enregistrement");
    },
  });

  const onSubmit = (data: FormData) => {
    if (!axaId) { toast.error('Compagnie AXA introuvable'); return; }
    if (clientMode === 'existing' && !data.clientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    if (clientMode === 'new' && !validateNewClient()) return;
    mutation.mutate(data);
  };

  /* ================================================================= */
  return (
    <div>
      <Header title="Saisir une production" />
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Enregistrez votre production journalière AXA. Le contrat est émis dans l'application AXA —
            cette saisie suit votre production et crée automatiquement le client s'il est nouveau.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">

          {/* ── Identification ── */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Identification</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">N° police AXA</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: AXA-2024-000123"
                  {...register('contractNumber')}
                />
                <p className="text-xs text-gray-400 mt-1">Optionnel — auto-généré si vide</p>
              </div>
              <div>
                <label className="label">Type d'assurance *</label>
                <select className="input" {...register('type')}>
                  <option value="">Sélectionner...</option>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
              </div>
            </div>

            {/* Toggle client */}
            <div>
              <label className="label mb-2">Client *</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setClientMode('existing')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    clientMode === 'existing'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  )}
                >
                  <Users className="w-4 h-4" /> Client existant
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode('new')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    clientMode === 'new'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                  )}
                >
                  <UserPlus className="w-4 h-4" /> Nouveau client
                </button>
              </div>

              {/* Sélection client existant */}
              {clientMode === 'existing' && (
                <div className="space-y-3">
                  <select className="input" {...register('clientId')}>
                    <option value="">Sélectionner un client...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.type === 'INDIVIDUAL' ? `${c.firstName} ${c.lastName}` : c.companyName}
                        {c.phone ? ` — ${c.phone}` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Fiche client sélectionné */}
                  {selectedClient && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">
                          {selectedClient.type === 'INDIVIDUAL'
                            ? `${selectedClient.firstName} ${selectedClient.lastName}`
                            : selectedClient.companyName}
                        </p>
                        <div className="text-gray-500 text-xs mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                          {selectedClient.phone && <span>📞 {selectedClient.phone}</span>}
                          {selectedClient.cin   && <span>CIN: {selectedClient.cin}</span>}
                          {selectedClient.ice   && <span>ICE: {selectedClient.ice}</span>}
                          {selectedClient.city  && <span>📍 {selectedClient.city}</span>}
                          {selectedClient.email && <span>✉ {selectedClient.email}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Formulaire nouveau client */}
              {clientMode === 'new' && (
                <div className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-3">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Nouveau client — sera créé automatiquement
                  </p>

                  {/* Type */}
                  <div className="flex gap-3">
                    {(['INDIVIDUAL', 'COMPANY'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="nc_type"
                          value={t}
                          checked={nc.type === t}
                          onChange={() => setNc(p => ({ ...p, type: t }))}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {t === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {nc.type === 'INDIVIDUAL' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Prénom *</label>
                        <input
                          type="text"
                          className={cn('input', ncErrors.firstName && 'border-red-400')}
                          value={nc.firstName}
                          onChange={e => setNc(p => ({ ...p, firstName: e.target.value }))}
                          placeholder="Mohammed"
                        />
                        {ncErrors.firstName && <p className="text-xs text-red-500 mt-1">{ncErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="label">Nom *</label>
                        <input
                          type="text"
                          className={cn('input', ncErrors.lastName && 'border-red-400')}
                          value={nc.lastName}
                          onChange={e => setNc(p => ({ ...p, lastName: e.target.value }))}
                          placeholder="Alaoui"
                        />
                        {ncErrors.lastName && <p className="text-xs text-red-500 mt-1">{ncErrors.lastName}</p>}
                      </div>
                      <div>
                        <label className="label">Téléphone *</label>
                        <input
                          type="tel"
                          className={cn('input', ncErrors.phone && 'border-red-400')}
                          value={nc.phone}
                          onChange={e => setNc(p => ({ ...p, phone: e.target.value }))}
                          placeholder="0612345678"
                        />
                        {ncErrors.phone && <p className="text-xs text-red-500 mt-1">{ncErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="label">CIN</label>
                        <input
                          type="text"
                          className="input"
                          value={nc.cin}
                          onChange={e => setNc(p => ({ ...p, cin: e.target.value }))}
                          placeholder="AB123456"
                        />
                      </div>
                      <div>
                        <label className="label">Ville</label>
                        <input
                          type="text"
                          className="input"
                          value={nc.city}
                          onChange={e => setNc(p => ({ ...p, city: e.target.value }))}
                          placeholder="Oued Zem"
                        />
                      </div>
                      <div>
                        <label className="label">Email</label>
                        <input
                          type="email"
                          className="input"
                          value={nc.email}
                          onChange={e => setNc(p => ({ ...p, email: e.target.value }))}
                          placeholder="client@email.com"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label">Raison sociale *</label>
                        <input
                          type="text"
                          className={cn('input', ncErrors.companyName && 'border-red-400')}
                          value={nc.companyName}
                          onChange={e => setNc(p => ({ ...p, companyName: e.target.value }))}
                          placeholder="SARL Transport Oued Zem"
                        />
                        {ncErrors.companyName && <p className="text-xs text-red-500 mt-1">{ncErrors.companyName}</p>}
                      </div>
                      <div>
                        <label className="label">Téléphone *</label>
                        <input
                          type="tel"
                          className={cn('input', ncErrors.phone && 'border-red-400')}
                          value={nc.phone}
                          onChange={e => setNc(p => ({ ...p, phone: e.target.value }))}
                          placeholder="0523456789"
                        />
                        {ncErrors.phone && <p className="text-xs text-red-500 mt-1">{ncErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="label">ICE</label>
                        <input
                          type="text"
                          className="input"
                          value={nc.ice}
                          onChange={e => setNc(p => ({ ...p, ice: e.target.value }))}
                          placeholder="001234567000001"
                        />
                      </div>
                      <div>
                        <label className="label">Ville</label>
                        <input
                          type="text"
                          className="input"
                          value={nc.city}
                          onChange={e => setNc(p => ({ ...p, city: e.target.value }))}
                          placeholder="Oued Zem"
                        />
                      </div>
                      <div>
                        <label className="label">Email</label>
                        <input
                          type="email"
                          className="input"
                          value={nc.email}
                          onChange={e => setNc(p => ({ ...p, email: e.target.value }))}
                          placeholder="contact@entreprise.ma"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Primes ── */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Primes (MAD)</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prime TTC *</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" className="input pr-16" placeholder="0.00" {...register('primeTTC')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">MAD</span>
                </div>
                {errors.primeTTC && <p className="text-xs text-red-500 mt-1">{errors.primeTTC.message}</p>}
              </div>
              <div>
                <label className="label">Réduction</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" className="input pr-16" placeholder="0.00" {...register('reduction')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">MAD</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Primes payées par le client</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" className="input pr-16" placeholder="0.00" {...register('primePaye')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">MAD</span>
                </div>
              </div>
              <div>
                <label className="label">Reste à payer</label>
                <div className={cn('input flex items-center justify-between bg-gray-50 font-semibold', resteAPayer > 0 ? 'text-red-600' : 'text-green-600')}>
                  <span>{fmt(resteAPayer)}</span>
                  <span className="text-xs font-normal text-gray-400">MAD</span>
                </div>
                {resteAPayer > 0 && <p className="text-xs text-red-500 mt-1">Reliquat : {fmt(resteAPayer)} MAD</p>}
              </div>
            </div>

            {(reduction > 0 || primePaye > 0) && (
              <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 border border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Prime TTC</p>
                  <p className="font-semibold text-gray-900 text-sm">{fmt(primeTTC)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Prime nette</p>
                  <p className="font-semibold text-gray-900 text-sm">{fmt(primeNette)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Reste à payer</p>
                  <p className={cn('font-semibold text-sm', resteAPayer > 0 ? 'text-red-600' : 'text-green-600')}>{fmt(resteAPayer)}</p>
                </div>
              </div>
            )}

            <div>
              <label className="label">Fréquence de paiement</label>
              <select className="input w-48" {...register('frequency')}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Dates ── */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Période de couverture</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date d'effet *</label>
                <input type="date" className="input" {...register('effectiveDate')} />
                {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{errors.effectiveDate.message}</p>}
              </div>
              <div>
                <label className="label">Date d'échéance</label>
                <input type="date" className="input" {...register('expiryDate')} />
                <p className="text-xs text-gray-400 mt-1">Auto-calculée (1 an)</p>
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="card p-6">
            <label className="label">Notes / Observations</label>
            <textarea rows={3} className="input" placeholder="Remarques éventuelles..." {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={mutation.isPending || !axaId} className="btn-primary">
              {mutation.isPending
                ? (clientMode === 'new' ? 'Création client...' : 'Enregistrement...')
                : 'Enregistrer la production'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
