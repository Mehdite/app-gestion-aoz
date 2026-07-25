import { createContext, useContext } from 'react';

export interface SidebarCtx { isOpen: boolean; toggle: () => void; close: () => void; }

export const SidebarContext = createContext<SidebarCtx>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export const useSidebarStore = () => useContext(SidebarContext);
