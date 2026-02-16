import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { Toaster } from "@/components/ui/sonner";
import LayoutClient from "@/components/LayoutClient"; // Importamos o visual de volta

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgênciaOS",
  description: "Painel de Gestão para Agência Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* 1. O Provider gerencia o estado (aberto/fechado) */}
          <SidebarProvider>
            
            {/* 2. O LayoutClient desenha a Sidebar e o Conteúdo */}
            <LayoutClient>
              {children}
            </LayoutClient>

          </SidebarProvider>
          
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}