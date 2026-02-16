"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, LogIn, Mail, Lock, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setErrorMsg("E-mail ou senha incorretos.");
      } else {
        router.push("/dashboard"); 
        router.refresh(); 
      }
    } catch (err) {
      setErrorMsg("Ocorreu um erro ao tentar entrar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <LogIn className="w-5 h-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo de volta</CardTitle>
          <CardDescription>
            Acesse o painel da Fluxo Digital
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            
            {errorMsg && (
              <div className="bg-red-500/15 text-red-500 text-sm p-3 rounded-md flex items-center gap-2 border border-red-500/20">
                <AlertCircle className="w-4 h-4" /> {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="pl-9" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {/* Mantive o "Esqueceu a senha" pois é útil para usuários internos */}
                <Link href="#" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-9" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 font-semibold" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
        {/* FOOTER REMOVIDO: Ninguém mais pode criar conta por aqui */}
      </Card>
    </div>
  );
}