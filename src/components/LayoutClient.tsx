"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { Search, UserCircle, LogOut, User } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Visão Geral",
  "/crm": "CRM & Leads",
  "/projetos": "Projetos Ativos",
  "/financeiro": "Financeiro",
  "/configuracoes": "Configurações",
};

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentTitle = PAGE_TITLES[pathname] || "Fluxo Digital";
  
  const [userData, setUserData] = useState<{ name?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          name: user.user_metadata?.full_name || user.user_metadata?.name || "Gestor",
          email: user.email
        });
      }
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out">
        
        <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg tracking-tight text-foreground">
              {currentTitle}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Busca Rápida */}
            <div className="relative hidden md:block mr-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="h-9 w-48 lg:w-64 rounded-md border border-input bg-muted/40 pl-9 pr-4 text-xs transition-all focus:w-80 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <ModeToggle />

            {/* Menu de Perfil */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="ml-1 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors group">
                  <UserCircle className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  {loading ? (
                    <div className="h-8 w-full animate-pulse bg-muted rounded" />
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userData?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/perfil")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Conteúdo das Páginas */}
        <div className="flex-1 overflow-auto p-4 md:p-6 no-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}