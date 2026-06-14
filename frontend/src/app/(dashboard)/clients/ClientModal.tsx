'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const schema = z.object({
  type: z.enum(['INDIVIDUAL', 'COMPANY']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  cin: z.string().optional(),
  dateOfBirth: z.string().optional(),
  companyName: z.string().optional(),
  ice: z.string().optional(),
  rc: z.string().optional(),
  taxId: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10, 'Téléphone requis (10 chiffres minimum)'),
  phone2: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  client?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientModal({ client, onClose, onSuccess }: Props) {
  const isEdit = !!client;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: client ?? { type: 'INDIVIDUAL' },
  });

  const type = watch('type');

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? apiHelper.put(`/clients/${client.id}`, data) : apiHelper.post('/clients', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Client modifié' : 'Client créé');
      onSuccess();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2>{isEdit ? 'Modifier le client' : 'Nouveau client'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="label">Type de client *</label>
            <div className="flex gap-3">
              {['INDIVIDUAL', 'COMPANY'].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={t} {...register('type')} className="text-brand-600" />
                  <span className="text-sm">{t === 'INDIVIDUAL' ? 'Personne physique' : 'Personne morale'}</span>
                </label>
              ))}
            </div>
          </div>

          {type === 'INDIVIDUAL' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom *</label>
                <input {...register('firstName')} className="input" placeholder="Mohammed" />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input {...register('lastName')} className="input" placeholder="Alaoui" />
              </div>
              <div>
                <label className="label">CIN</label>
                <input {...register('cin')} className="input" placeholder="AB123456" />
              </div>
              <div>
                <label className="label">Date de naissance</label>
                <input {...register('dateOfBirth')} type="date" className="input" />
              </div>
            </div>
          )}

          {type === 'COMPANY' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Raison sociale *</label>
                <input {...register('companyName')} className="input" placeholder="SARL Transport Maroc" />
              </div>
              <div>
                <label className="label">ICE</label>
                <input {...register('ice')} className="input" placeholder="001234567000001" />
              </div>
              <div>
                <label className="label">RC</label>
                <input {...register('rc')} className="input" placeholder="RC/12345" />
              </div>
              <div>
                <label className="label">Identifiant fiscal</label>
                <input {...register('taxId')} className="input" placeholder="12345678" />
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Téléphone *</label>
              <input {...register('phone')} className="input" placeholder="0612345678" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Téléphone 2</label>
              <input {...register('phone2')} className="input" placeholder="0522345678" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="contact@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
            </div>
            <div>
              <label className="label">Source</label>
              <select {...register('source')} className="input">
                <option value="">Sélectionner...</option>
                <option value="Bouche à oreille">Bouche à oreille</option>
                <option value="Réseaux sociaux">Réseaux sociaux</option>
                <option value="Site web">Site web</option>
                <option value="Prospection">Prospection</option>
                <option value="Partenaire">Partenaire</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="label">Adresse</label>
              <input {...register('address')} className="input" placeholder="12 Rue Hassan II" />
            </div>
            <div>
              <label className="label">Ville</label>
              <input {...register('city')} className="input" placeholder="Oued Zem" />
            </div>
            <div>
              <label className="label">Code postal</label>
              <input {...register('postalCode')} className="input" placeholder="26000" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input" rows={3} placeholder="Informations complémentaires..." />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
