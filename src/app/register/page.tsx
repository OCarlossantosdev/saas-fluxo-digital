"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // --- O SEGREDO ESTÁ AQUI ---
      // Enviamos o 'name' dentro de options.data
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name, // Isso dispara o gatilho para a tabela 'profiles'
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // Sucesso!
        setSuccessMsg("Conta criada com sucesso! Verifique seu e-mail ou faça login.");
        
        // Opcional: Redirecionar direto ou esperar confirmação
        // Se o email confirm for desligado no Supabase, ele já loga direto.
        if (data.session) {
            router.push("/dashboard"); 
        }
      }
    } catch (err) {
      setErrorMsg("Ocorreu um erro inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Crie sua conta</CardTitle>
          <CardDescription>
            Junte-se à gestão da agência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            
            {errorMsg && (
              <div className="bg-red-500/15 text-red-500 text-sm p-3 rounded-md flex items-center gap-2 border border-red-500/20">
                <AlertCircle className="w-4 h-4" /> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/15 text-emerald-500 text-sm p-3 rounded-md flex items-center gap-2 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="name" 
                  placeholder="Ex: Carlos Silva" 
                  className="pl-9" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nome@agencia.com" 
                  className="pl-9" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
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
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 font-semibold" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Conta"} 
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Fazer Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}