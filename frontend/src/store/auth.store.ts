import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'AGENT';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Cookie options without 'secure' so they work on http://localhost
const COOKIE_OPTS_SHORT = { expires: 1 / 96, sameSite: 'lax' as const };
const COOKIE_OPTS_LONG  = { expires: 7,      sameSite: 'lax' as const };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { accessToken, refreshToken, user } = data.data ?? data;

          Cookies.set('accessToken', accessToken, COOKIE_OPTS_SHORT);
          Cookies.set('refreshToken', refreshToken, COOKIE_OPTS_LONG);
          Cookies.set('userId', user.id, COOKIE_OPTS_LONG);

          set({ user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('userId');
        set({ user: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      refreshProfile: async () => {
        try {
          const { data } = await api.get('/auth/profile');
          set({ user: data.data ?? data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'aoz-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
);

export const useUser = () => useAuthStore((s) => s.user);
export const useIsAdmin = () => useAuthStore((s) => s.user?.role === 'ADMIN');
