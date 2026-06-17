'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/auth.store';
import { User, Lock, Eye, EyeOff, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParametresPage() {
  const { user, refreshProfile } = useAuthStore();

  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({ firstName: user.firstName, lastName: user.lastName, phone: (user as any).phone ?? '' });
    }
  }, [user]);

  const profileMut = useMutation({
    mutationFn: () => apiHelper.patch('/auth/profile', {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone || undefined,
    }),
    onSuccess: async () => {
      await refreshProfile();
      toast.success('Profil mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const pwdMut = useMutation({
    mutationFn: () => apiHelper.post('/auth/change-password', {
      currentPassword: pwd.currentPassword,
      newPassword: pwd.newPassword,
    }),
    onSuccess: () => {
      toast.success('Mot de passe modifié');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function handlePwdSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (pwd.newPassword.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    pwdMut.mutate();
  }

  return (
    <div>
      <Header title="Paramètres" />
      <div className="p-6 max-w-2xl space-y-6">

        {/* Mon profil */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-brand-50 rounded-lg">
              <User className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Mon profil</h2>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); profileMut.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <input
                  className="input"
                  value={profile.firstName}
                  onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  className="input"
                  value={profile.lastName}
                  onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input className="input bg-gray-50 text-gray-400 cursor-not-allowed" value={user?.email ?? ''} disabled />
              <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div>
              <label className="label">Téléphone</label>
              <input
                className="input"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="0661234567"
              />
            </div>

            <div className="pt-1">
              <button type="submit" disabled={profileMut.isPending} className="btn-primary">
                {profileMut.isPending ? 'Enregistrement...' : (
                  <><Check className="w-4 h-4" /> Enregistrer le profil</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Changer mot de passe */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Changer le mot de passe</h2>
          </div>

          <form onSubmit={handlePwdSubmit} className="space-y-4">
            <div>
              <label className="label">Mot de passe actuel</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showCurrent ? 'text' : 'password'}
                  value={pwd.currentPassword}
                  onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showNew ? 'text' : 'password'}
                  value={pwd.newPassword}
                  onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Minimum 6 caractères"
                  required
                />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirmer le nouveau mot de passe</label>
              <input
                className="input"
                type="password"
                value={pwd.confirm}
                onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                required
              />
              {pwd.confirm && pwd.newPassword !== pwd.confirm && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <div className="pt-1">
              <button type="submit" disabled={pwdMut.isPending} className="btn-primary">
                {pwdMut.isPending ? 'Modification...' : (
                  <><Lock className="w-4 h-4" /> Changer le mot de passe</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
