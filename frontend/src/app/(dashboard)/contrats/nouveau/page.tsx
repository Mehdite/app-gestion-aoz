'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const TYPES = [
  { value: 'AUTO',            label: 'Automobile' },
  { value: 'MOTO',            label: 'Moto' },
  { value: 'HOME',            label: 'Habitation' },
  { value: 'HEALTH',          label: 'Santé' },
  { value: 'PROFESSIONAL',    label: 'Multirisque Pro' },
  { value: 'DECENNIAL',       label: 'Décennale' },
  { value: 'TRANSPORT',       label: 'Transport' },
  { value: 'LIFE',            label: 'Vie' },
  { value: 'WORK_ACCIDENT',   label: 'Accident de travail' },
  { value: 'RC_EXPLOITATION', label: 'RC Exploitation' },
  { value: 'RC_PRO',          label: 'RC Pro' },
  { value: 'OTHER',           label: 'Autre' },
];

const FREQUENCIES = [
  { value: 'ANNUAL',      label: 'Annuelle' },
  { value: 'SEMI_ANNUAL', label: 'Semestrielle' },
  { value: 'QUARTERLY',   label: 'Trimestrielle' },
  { value: 'MONTHLY',     label: 'Mensuelle' },
];

/* Map code → route de retour */
const REDIRECT_BY_CODE: Record<string, string> = {
  AXA:        '/contrats',
  CAT:        '/production-cat',
  COVER_EDGE: '/production-cover-edge',
};

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
function SaisirProductionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyCode = searchParams.get('company') ?? 'AXA';
  const redirectPath = REDIRECT_BY_CODE[companyCode] ?? '/contrats';

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

  /* Compagnie sélectionnée via le paramètre URL */
  const selectedCompany = companies.find((c: any) => c.code === companyCode) ?? null;
  const selectedCompanyId = selectedCompany?.id ?? '';

  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [clientSearch, setClientSearch]     = useState('');
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientObj, setSelectedClientObj] = useState<any>(null);

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
  const ncRef = useRef(nc);
  useEffect(() => { ncRef.current = nc; }, [nc]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { frequency: 'ANNUAL', reduction: 0, primePaye: 0 },
  });

  const primeTTC      = Number(watch('primeTTC'))  || 0;
  const reduction     = Number(watch('reduction')) || 0;
  const primePaye     = Number(watch('primePaye')) || 0;
  const effectiveDate = watch('effectiveDate');

  const primeNette  = Math.max(0, primeTTC - reduction);
  const resteAPayer = Math.max(0, primeNette - primePaye);

  const filteredClients = clientSearch.length >= 1
    ? clients.filter((c: any) => {
        const name = c.type === 'INDIVIDUAL'
          ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
          : (c.companyName ?? '').toLowerCase();
        const q = clientSearch.toLowerCase();
        return name.includes(q) || (c.phone ?? '').includes(q) || (c.cin ?? '').toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  useEffect(() => {
    if (effectiveDate) setValue('expiryDate', addOneYear(effectiveDate));
  }, [effectiveDate, setValue]);

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

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const currentNc = ncRef.current;
      let resolvedClientId = selectedClientId;

      if (clientMode === 'new') {
        const clientPayload: any = { type: currentNc.type, phone: currentNc.phone.trim() };
        if (currentNc.type === 'INDIVIDUAL') {
          clientPayload.firstName = currentNc.firstName.trim();
          clientPayload.lastName  = currentNc.lastName.trim();
          if (currentNc.cin.trim()) clientPayload.cin = currentNc.cin.trim();
        } else {
          clientPayload.companyName = currentNc.companyName.trim();
          if (currentNc.ice.trim()) clientPayload.ice = currentNc.ice.trim();
        }
        if (currentNc.email.trim()) clientPayload.email = currentNc.email.trim();
        if (currentNc.city.trim())  clientPayload.city  = currentNc.city.trim();

        const res = await apiHelper.post<any>('/clients', clientPayload);
        resolvedClientId = (res as any).data?.id ?? (res as any).id;
      }

      if (!resolvedClientId) throw new Error('Client introuvable — veuillez sélectionner ou créer un client');

      return apiHelper.post('/contracts', {
        ...data,
        clientId:  resolvedClientId,
        companyId: selectedCompanyId,
        primeHT:   data.primeTTC,
        taxes:     0,
        autoRenew: false,
      });
    },
    onSuccess: () => {
      toast.success('Production enregistrée' + (clientMode === 'new' ? ' — nouveau client créé' : ''));
      router.push(redirectPath);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? e?.message ?? "Erreur lors de l'enregistrement");
      toast.error(text);
    },
  });

  const onSubmit = (data: FormData) => {
    if (!selectedCompanyId) { toast.error(`Compagnie ${companyCode} introuvable en base`); return; }
    if (clientMode === 'existing' && !selectedClientId) {
      toast.error('Veuillez sélectionner un client dans la liste');
      return;
    }
    if (clientMode === 'new' && !validateNewClient()) return;
    mutation.mutate(data);
  };

  const companyLabel = selectedCompany?.name ?? companyCode;

  return (
    <div>
      <Header title={`Saisir une production — ${companyLabel}`} />
      <div className="p-6">
        <button onClick={() => router.push(redirectPath)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Enregistrez votre production journalière <strong>{companyLabel}</strong>. Le contrat est émis dans
            l&apos;application {companyCode} — cette saisie suit votre production et crée automatiquement le client s&apos;il est nouveau.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">

          {/* Identification */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Identification</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">N° police</label>
                <input
                  type="text"
                  className="input"
                  placeholder={`Ex: ${companyCode}-2024-000123`}
                  {...register('contractNumber')}
                />
                <p className="text-xs text-gray-400 mt-1">Optionnel — auto-généré si vide</p>
              </div>
              <div>
                <label className="label">Type d&apos;assurance *</label>
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

              {clientMode === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      className="input"
                      placeholder="Rechercher par nom, téléphone ou CIN..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDrop(true);
                        setSelectedClientId('');
                        setSelectedClientObj(null);
                      }}
                      onFocus={() => setShowClientDrop(true)}
                      onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                      autoComplete="off"
                    />
                    {showClientDrop && filteredClients.length > 0 && (
                      <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                        {filteredClients.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full px-3 py-2.5 text-left hover:bg-brand-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0"
                            onMouseDown={() => {
                              setSelectedClientId(c.id);
                              setSelectedClientObj(c);
                              setClientSearch(
                                c.type === 'INDIVIDUAL'
                                  ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
                                  : c.companyName ?? ''
                              );
                              setShowClientDrop(false);
                            }}
                          >
                            <span className="font-medium text-sm text-gray-900">
                              {c.type === 'INDIVIDUAL'
                                ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
                                : c.companyName}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showClientDrop && clientSearch.length >= 1 && filteredClients.length === 0 && (
                      <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-3 py-3 text-sm text-gray-400">
                        Aucun client trouvé — utilisez &quot;Nouveau client&quot;
                      </div>
                    )}
                  </div>

                  {selectedClientObj && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">
                          {selectedClientObj.type === 'INDIVIDUAL'
                            ? `${selectedClientObj.firstName ?? ''} ${selectedClientObj.lastName ?? ''}`.trim()
                            : selectedClientObj.companyName}
                        </p>
                        <div className="text-gray-500 text-xs mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                          {selectedClientObj.phone && <span>📞 {selectedClientObj.phone}</span>}
                          {selectedClientObj.cin   && <span>CIN: {selectedClientObj.cin}</span>}
                          {selectedClientObj.ice   && <span>ICE: {selectedClientObj.ice}</span>}
                          {selectedClientObj.city  && <span>📍 {selectedClientObj.city}</span>}
                          {selectedClientObj.email && <span>✉ {selectedClientObj.email}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {clientMode === 'new' && (
                <div className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-3">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Nouveau client — sera créé automatiquement
                  </p>

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
                        <input type="text" className={cn('input', ncErrors.firstName && 'border-red-400')} value={nc.firstName} onChange={e => setNc(p => ({ ...p, firstName: e.target.value }))} placeholder="Mohammed" />
                        {ncErrors.firstName && <p className="text-xs text-red-500 mt-1">{ncErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="label">Nom *</label>
                        <input type="text" className={cn('input', ncErrors.lastName && 'border-red-400')} value={nc.lastName} onChange={e => setNc(p => ({ ...p, lastName: e.target.value }))} placeholder="Alaoui" />
                        {ncErrors.lastName && <p className="text-xs text-red-500 mt-1">{ncErrors.lastName}</p>}
                      </div>
                      <div>
                        <label className="label">Téléphone *</label>
                        <input type="tel" className={cn('input', ncErrors.phone && 'border-red-400')} value={nc.phone} onChange={e => setNc(p => ({ ...p, phone: e.target.value }))} placeholder="0612345678" />
                        {ncErrors.phone && <p className="text-xs text-red-500 mt-1">{ncErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="label">CIN</label>
                        <input type="text" className="input" value={nc.cin} onChange={e => setNc(p => ({ ...p, cin: e.target.value }))} placeholder="AB123456" />
                      </div>
                      <div>
                        <label className="label">Ville</label>
                        <input type="text" className="input" value={nc.city} onChange={e => setNc(p => ({ ...p, city: e.target.value }))} placeholder="Oued Zem" />
                      </div>
                      <div>
                        <label className="label">Email</label>
                        <input type="email" className="input" value={nc.email} onChange={e => setNc(p => ({ ...p, email: e.target.value }))} placeholder="client@email.com" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label">Raison sociale *</label>
                        <input type="text" className={cn('input', ncErrors.companyName && 'border-red-400')} value={nc.companyName} onChange={e => setNc(p => ({ ...p, companyName: e.target.value }))} placeholder="SARL Transport Oued Zem" />
                        {ncErrors.companyName && <p className="text-xs text-red-500 mt-1">{ncErrors.companyName}</p>}
                      </div>
                      <div>
                        <label className="label">Téléphone *</label>
                        <input type="tel" className={cn('input', ncErrors.phone && 'border-red-400')} value={nc.phone} onChange={e => setNc(p => ({ ...p, phone: e.target.value }))} placeholder="0523456789" />
                        {ncErrors.phone && <p className="text-xs text-red-500 mt-1">{ncErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="label">ICE</label>
                        <input type="text" className="input" value={nc.ice} onChange={e => setNc(p => ({ ...p, ice: e.target.value }))} placeholder="001234567000001" />
                      </div>
                      <div>
                        <label className="label">Ville</label>
                        <input type="text" className="input" value={nc.city} onChange={e => setNc(p => ({ ...p, city: e.target.value }))} placeholder="Oued Zem" />
                      </div>
                      <div>
                        <label className="label">Email</label>
                        <input type="email" className="input" value={nc.email} onChange={e => setNc(p => ({ ...p, email: e.target.value }))} placeholder="contact@entreprise.ma" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primes */}
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

          {/* Dates */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Période de couverture</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date d&apos;effet *</label>
                <input type="date" className="input" {...register('effectiveDate')} />
                {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{errors.effectiveDate.message}</p>}
              </div>
              <div>
                <label className="label">Date d&apos;échéance</label>
                <input type="date" className="input" {...register('expiryDate')} />
                <p className="text-xs text-gray-400 mt-1">Auto-calculée (1 an)</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-6">
            <label className="label">Notes / Observations</label>
            <textarea rows={3} className="input" placeholder="Remarques éventuelles..." {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push(redirectPath)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={mutation.isPending || !selectedCompanyId} className="btn-primary">
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

/* Suspense boundary requis par Next.js 14 pour useSearchParams */
export default function SaisirProductionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Chargement...</div>}>
      <SaisirProductionForm />
    </Suspense>
  );
}
