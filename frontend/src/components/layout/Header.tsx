'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { useUser } from '@/store/auth.store';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiHelper } from '@/lib/api';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const user = useUser();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none flex-1"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
