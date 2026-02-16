"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type SidebarContextType = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Inicia fechada em telas pequenas, aberta em grandes
  const [isOpen, setIsOpen] = useState(true);

  // Opcional: Fechar automaticamente em mobile ao carregar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    
    // Executa na montagem
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close, open }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}