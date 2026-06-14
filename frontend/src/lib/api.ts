import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshing = false;
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry && !refreshing) {
      original._retry = true;
      refreshing = true;
      try {
        const refreshToken = Cookies.get('refreshToken');
        const userId = Cookies.get('userId');
        if (!refreshToken || !userId) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { userId, refreshToken },
        );
        Cookies.set('accessToken', data.data.accessToken, { expires: 1 / 96 });
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('userId');
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export const apiHelper = {
  get: <T>(url: string, params?: Record<string, any>) =>
    api.get<{ success: boolean; data: T; meta?: any }>(url, { params }).then((r) => r.data),
  post: <T>(url: string, data?: any) =>
    api.post<{ success: boolean; data: T }>(url, data).then((r) => r.data),
  put: <T>(url: string, data?: any) =>
    api.put<{ success: boolean; data: T }>(url, data).then((r) => r.data),
  patch: <T>(url: string, data?: any) =>
    api.patch<{ success: boolean; data: T }>(url, data).then((r) => r.data),
  delete: <T>(url: string) =>
    api.delete<{ success: boolean; data: T }>(url).then((r) => r.data),
};
