'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const SOURCES = ['REFERRAL', 'WEBSITE', 'PHONE', 'SOCIAL', 'EMAIL', 'OTHER'];
const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: 'Recommandation',
  WEBSITE: 'Site web',
  PHONE: 'Téléphone',
  SOCIAL: 'Réseaux sociaux',
  EMAIL: 'Email',
  OTHER: 'Autre',
};

export default function NouveauProspectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    source: '',
    notes: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const createMut = useMutation({
    mutationFn: (data: typeof form) => apiHelper.post('/prospects', data),
    onSuccess: () => {
      toast.success('Prospect ajouté avec succès');
      router.push('/prospects');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erreur lors de la création'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      toast.error('Prénom, nom et téléphone sont obligatoires');
      return;
    }
    createMut.mutate(form);
  };

  return (
    <div>
      <Header title="Nouveau prospect" />
      <div className="p-6 max-w-2xl mx-auto">
        <Link href="/prospects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour aux prospects
        </Link>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Informations du prospect</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.lastName} onChange={set('lastName')} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Téléphone *</label>
              <input className="input" type="tel" value={form.phone} onChange={set('phone')} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Entreprise</label>
              <input className="input" value={form.company} onChange={set('company')} />
            </div>
            <div>
              <label className="label">Source</label>
              <select className="input" value={form.source} onChange={set('source')}>
                <option value="">— Sélectionner —</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.notes}
              onChange={set('notes')}
              placeholder="Informations complémentaires..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/prospects" className="btn-secondary">Annuler</Link>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Enregistrement...' : 'Ajouter le prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
