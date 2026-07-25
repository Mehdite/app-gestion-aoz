'use client';

import { useState, ReactNode } from 'react';
import { SidebarContext } from './sidebar.store';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ isOpen, toggle: () => setIsOpen(o => !o), close: () => setIsOpen(false) }}>
      {children}
    </SidebarContext.Provider>
  );
}
