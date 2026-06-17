'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, formatDate } from '@/lib/utils';
import { Plus, X, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = ['ADMIN', 'AGENT'];

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  AGENT: 'bg-blue-100 text-blue-700',
};

type UserForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone: string;
};

const emptyForm: UserForm = { firstName: '', lastName: '', email: '', password: '', role: 'AGENT', phone: '' };

export default function UtilisateursPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [showPwd, setShowPwd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiHelper.get<any[]>('/users'),
  });

  const users: any[] = (data as any)?.data ?? [];

  const createMut = useMutation({
    mutationFn: (body: UserForm) => apiHelper.post('/users', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé');
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la création'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => apiHelper.patch(`/users/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Statut mis à jour'); },
    onError: () => toast.error('Erreur'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    createMut.mutate(form);
  }

  return (
    <div>
      <Header title="Gestion des utilisateurs" />
      <div className="p-6 space-y-5">

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{users.length} compte{users.length !== 1 ? 's' : ''}</p>
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouveau compte
          </button>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header-cell">Nom</th>
                <th className="table-header-cell">Email</th>
                <th className="table-header-cell">Téléphone</th>
                <th className="table-header-cell">Rôle</th>
                <th className="table-header-cell">Dernière connexion</th>
                <th className="table-header-cell">Créé le</th>
                <th className="table-header-cell">Statut</th>
                <th className="table-header-cell w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => (
                  <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-24" /></td>
                ))}</tr>
              ))}
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">Aucun utilisateur</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className={cn('hover:bg-gray-50 transition-colors', !u.isActive && 'opacity-50')}>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-gray-600">{u.email}</td>
                  <td className="table-cell text-sm">{u.phone ?? '—'}</td>
                  <td className="table-cell">
                    <span className={cn('badge', roleColors[u.role] ?? 'bg-gray-100 text-gray-600')}>{u.role}</span>
                  </td>
                  <td className="table-cell text-xs text-gray-400">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                  </td>
                  <td className="table-cell text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                  <td className="table-cell">
                    <span className={cn('badge', u.isActive ? 'badge-active' : 'bg-gray-100 text-gray-500')}>
                      {u.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleMut.mutate(u.id)}
                      className={cn('p-1.5 rounded transition-colors', u.isActive
                        ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      )}
                      title={u.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Nouveau compte utilisateur</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prénom *</label>
                  <input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Mohammed" required />
                </div>
                <div>
                  <label className="label">Nom *</label>
                  <input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Alaoui" required />
                </div>
              </div>

              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="agent@example.com" required />
              </div>

              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0661234567" />
              </div>

              <div>
                <label className="label">Rôle *</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">ADMIN : accès complet · AGENT : accès standard</p>
              </div>

              <div>
                <label className="label">Mot de passe *</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimum 6 caractères"
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMut.isPending} className="btn-primary flex-1">
                  {createMut.isPending ? 'Création...' : 'Créer le compte'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
