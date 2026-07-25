'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';

function closeSidebar() {
  const aside = document.querySelector('aside.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (aside) aside.classList.remove('sidebar--open');
  if (backdrop) backdrop.style.display = 'none';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login');
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#EDF2F7' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#1A73E8', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#7A98B8' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen" style={{ background: '#EDF2F7' }}>
      {/* Backdrop mobile */}
      <div
        id="sidebar-backdrop"
        className="fixed inset-0 z-20 lg:hidden"
        style={{ background: 'rgba(4,13,26,0.45)', display: 'none' }}
        onClick={closeSidebar}
      />
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
