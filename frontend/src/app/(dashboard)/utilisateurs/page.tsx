'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { cn, formatDate } from '@/lib/utils';
import { Plus, X, UserCheck, UserX, Eye, EyeOff, Shield, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = ['ADMIN', 'AGENT'];

const ALL_MODULES = [
  { key: 'clients',     label: 'Clients' },
  { key: 'prospects',   label: 'Prospects & CRM' },
  { key: 'contrats',    label: 'Production' },
  { key: 'quittances',  label: 'Quittances Impayées' },
  { key: 'sinistres',   label: 'Sinistres' },
  { key: 'commissions', label: 'Commissions' },
  { key: 'rapports',    label: 'Rapports' },
];

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
  permissions: string[];
};

const emptyForm: UserForm = {
  firstName: '', lastName: '', email: '', password: '',
  role: 'AGENT', phone: '',
  permissions: ALL_MODULES.map(m => m.key),
};

export default function UtilisateursPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPerms, setEditPerms] = useState<{ id: string; permissions: string[] } | null>(null);
  const [editUser, setEditUser] = useState<{ id: string; firstName: string; lastName: string; phone: string; role: string } | null>(null);
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

  const editMut = useMutation({
    mutationFn: ({ id, ...data }: any) => apiHelper.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur modifié');
      setEditUser(null);
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  const permsMut = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiHelper.put(`/users/${id}`, { permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Permissions mises à jour');
      setEditPerms(null);
    },
    onError: () => toast.error('Erreur'),
  });

  function togglePerm(key: string) {
    if (!editPerms) return;
    const has = editPerms.permissions.includes(key);
    setEditPerms({
      ...editPerms,
      permissions: has
        ? editPerms.permissions.filter(p => p !== key)
        : [...editPerms.permissions, key],
    });
  }

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
                <th className="table-header-cell">Rôle</th>
                <th className="table-header-cell">Accès aux onglets</th>
                <th className="table-header-cell">Dernière connexion</th>
                <th className="table-header-cell">Statut</th>
                <th className="table-header-cell w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="table-cell"><div className="animate-pulse bg-gray-100 rounded h-4 w-24" /></td>
                ))}</tr>
              ))}
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Aucun utilisateur</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className={cn('hover:bg-gray-50 transition-colors', !u.isActive && 'opacity-50')}>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400">{u.phone ?? ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-gray-600">{u.email}</td>
                  <td className="table-cell">
                    <span className={cn('badge', roleColors[u.role] ?? 'bg-gray-100 text-gray-600')}>{u.role}</span>
                  </td>
                  <td className="table-cell">
                    {u.role === 'ADMIN' ? (
                      <span className="text-xs text-purple-600 font-medium">Accès complet</span>
                    ) : (u.permissions ?? []).length === 0 ? (
                      <span className="text-xs text-gray-400">Aucun accès</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(u.permissions as string[]).map(p => {
                          const mod = ALL_MODULES.find(m => m.key === p);
                          return mod ? (
                            <span key={p} className="badge bg-gray-100 text-gray-600 text-xs">{mod.label}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </td>
                  <td className="table-cell text-xs text-gray-400">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                  </td>
                  <td className="table-cell">
                    <span className={cn('badge', u.isActive ? 'badge-active' : 'bg-gray-100 text-gray-500')}>
                      {u.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditUser({ id: u.id, firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? '', role: u.role })}
                        className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-brand-50"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => setEditPerms({ id: u.id, permissions: u.permissions ?? [] })}
                          className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-brand-50"
                          title="Modifier les accès"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
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
                    </div>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                <p className="text-xs text-gray-400 mt-1">ADMIN : accès complet · AGENT : accès limité aux onglets choisis</p>
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

              {form.role !== 'ADMIN' && (
                <div>
                  <label className="label">Onglets accessibles</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {ALL_MODULES.map(m => (
                      <label key={m.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(m.key)}
                          onChange={() => {
                            const has = form.permissions.includes(m.key);
                            setForm(f => ({
                              ...f,
                              permissions: has ? f.permissions.filter(p => p !== m.key) : [...f.permissions, m.key],
                            }));
                          }}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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

      {/* Modal modification utilisateur */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Modifier l'utilisateur</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); editMut.mutate(editUser); }}
              className="px-6 py-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prénom</label>
                  <input className="input" value={editUser.firstName} onChange={e => setEditUser(u => u && ({ ...u, firstName: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input className="input" value={editUser.lastName} onChange={e => setEditUser(u => u && ({ ...u, lastName: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={editUser.phone} onChange={e => setEditUser(u => u && ({ ...u, phone: e.target.value }))} placeholder="0661234567" />
              </div>
              <div>
                <label className="label">Rôle</label>
                <select className="input" value={editUser.role} onChange={e => setEditUser(u => u && ({ ...u, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">ADMIN : accès complet · AGENT : accès limité</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editMut.isPending} className="btn-primary flex-1">
                  {editMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal permissions */}
      {editPerms && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-600" /> Modifier les accès
              </h2>
              <button onClick={() => setEditPerms(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">Cochez les onglets auxquels cet utilisateur aura accès.</p>
              <div className="space-y-2">
                {ALL_MODULES.map(m => (
                  <label key={m.key} className="flex items-center gap-3 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={editPerms.permissions.includes(m.key)}
                      onChange={() => togglePerm(m.key)}
                      className="w-4 h-4 text-brand-600 rounded"
                    />
                    <span className="text-sm text-gray-800">{m.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => permsMut.mutate(editPerms)}
                  disabled={permsMut.isPending}
                  className="btn-primary flex-1"
                >
                  {permsMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button onClick={() => setEditPerms(null)} className="btn-secondary">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
