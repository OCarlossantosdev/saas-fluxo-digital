"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // Adicionado useRouter
import { createClient } from "@/lib/supabase"; // Adicionado conexão com Supabase
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/hooks/use-sidebar";
import { 
  LayoutDashboard, FolderKanban, StickyNote, DollarSign, 
  LineChart, CheckSquare, Users, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FolderKanban, label: "Projetos", href: "/projetos" },
  { icon: StickyNote, label: "Anotações", href: "/anotacoes" },
  { icon: DollarSign, label: "Faturamento", href: "/faturamento" },
  { icon: CheckSquare, label: "Tarefas", href: "/tarefas" },
  { icon: Users, label: "Clientes", href: "/clientes" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter(); // Instância do router
  const supabase = createClient(); // Instância do supabase
  const { isOpen, toggle } = useSidebar();

  // Função de Logout
  async function handleLogout() {
    await supabase.auth.signOut(); // Desconecta do Supabase
    router.push("/login"); // Redireciona para o login
    router.refresh(); // Limpa o estado da página
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex flex-col h-screen border-r border-border bg-background transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "w-64" : "w-[70px]"
        )}
      >
        {/* Botão de Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-3 h-8 w-8 md:flex hidden"
          onClick={toggle}
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {/* Logo / Título */}
        <div className={cn("flex items-center h-16 px-4", isOpen ? "justify-start" : "justify-center")}>
          {isOpen ? (
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-muted-foreground bg-clip-text text-transparent">
             Fluxo Digital
            </span>
          ) : (
            <span className="text-xl font-bold text-primary">F</span>
          )}
        </div>

        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-2 p-2">
            {sidebarItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              
              const LinkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    !isOpen && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className={cn("truncate transition-all", isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>
                    {item.label}
                  </span>
                </Link>
              );

              if (isOpen) return <div key={item.href}>{LinkContent}</div>;

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{LinkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Botão de Sair Funcional */}
        <div className="p-2 mt-auto border-t border-border">
          {isOpen ? (
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-3"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>Sair</span>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}