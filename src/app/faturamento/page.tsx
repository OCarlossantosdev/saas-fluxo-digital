"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Plus, Search, Trash2, Loader2, DollarSign, ArrowUpCircle, ArrowDownCircle, Wallet, Calendar as CalendarIcon, AlertTriangle
} from "lucide-react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "receita" | "despesa";
  date: string;
  status: "pago" | "pendente";
}

export default function FaturamentoPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- ESTADOS PARA MODAL DE EXCLUSÃO ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "receita",
    date: new Date().toISOString().split('T')[0], // Data de hoje por padrão
    status: "pago",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // --- MÁSCARA DE MOEDA ---
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value === "") {
      setFormData({ ...formData, amount: "" });
      return;
    }
    const numericValue = (parseInt(value, 10) / 100).toFixed(2); 
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(numericValue));
    
    setFormData({ ...formData, amount: formattedValue });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    if (!error && data) {
      setTransactions(data);
    } else {
      console.error(error);
    }
    setIsLoading(false);
  }

  function handleOpenChange(open: boolean) {
    setIsDialogOpen(open);
    if (!open) {
      setFormData({
        description: "",
        amount: "",
        type: "receita",
        date: new Date().toISOString().split('T')[0],
        status: "pago",
      });
    }
  }

  async function handleSaveTransaction(e: React.FormEvent) {
    e.preventDefault(); 
    if (!formData.description || !formData.amount) {
      alert("Preencha a descrição e o valor!");
      return;
    }

    setIsSaving(true);
    
    const cleanValueString = formData.amount.replace(/\./g, "").replace(",", ".");
    const numericValue = parseFloat(cleanValueString) || 0;

    const { data: { user } } = await supabase.auth.getUser();
    
    // Montamos os dados base sem o user_id primeiro
    const insertData: any = {
      description: formData.description,
      amount: numericValue,
      type: formData.type,
      date: formData.date,
      status: formData.status,
    };

    // Só adiciona o user_id se o usuário estiver logado
    if (user?.id) {
      insertData.user_id = user.id;
    }

    const { error } = await supabase.from("transactions").insert([insertData]);

    if (!error) {
      fetchTransactions();
      handleOpenChange(false);
    } else {
      // AQUI ESTÁ A MAGIA PARA DESCOBRIR O ERRO:
      alert(`ERRO DO SUPABASE:\nMensagem: ${error.message}\nDetalhes: ${error.details || "Nenhum detalhe extra"}`);
      console.error("Erro completo do Supabase:", error);
    }
    
    setIsSaving(false);
  }

  // --- SOLICITAÇÃO DE EXCLUSÃO ---
  function requestDeleteTransaction(id: string) {
    setTransactionToDeleteId(id);
    setIsDeleteModalOpen(true);
  }

  // --- CONFIRMAÇÃO DE EXCLUSÃO ---
  async function confirmDeleteTransaction() {
    if (!transactionToDeleteId) return;
    
    const { error } = await supabase.from("transactions").delete().eq("id", transactionToDeleteId);
    
    if (!error) {
      setTransactions(transactions.filter((t) => t.id !== transactionToDeleteId));
    }
    
    setIsDeleteModalOpen(false);
    setTransactionToDeleteId(null);
  }

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- CÁLCULO DOS CARDS DE RESUMO ---
  const totalReceitas = transactions.filter(t => t.type === 'receita' && t.status === 'pago').reduce((acc, curr) => acc + curr.amount, 0);
  const totalDespesas = transactions.filter(t => t.type === 'despesa' && t.status === 'pago').reduce((acc, curr) => acc + curr.amount, 0);
  const saldoAtual = totalReceitas - totalDespesas;
  const pendenteReceber = transactions.filter(t => t.type === 'receita' && t.status === 'pendente').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-2">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Faturamento</h2>
          <p className="text-muted-foreground">Controle as entradas e saídas da sua agência.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2 font-semibold shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4" /> Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
              <DialogDescription>Adicione uma nova receita ou despesa.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveTransaction} className="space-y-4 mt-2">
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input required id="description" placeholder="Ex: Pagamento Site Cliente X" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 pt-2">
                  <Label htmlFor="value" className="font-medium">Valor</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                    <Input required id="value" type="text" placeholder="0,00" className="pl-10 font-medium" value={formData.amount} onChange={handleCurrencyChange} />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: "receita" | "despesa") => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita (Entrada)</SelectItem>
                      <SelectItem value="despesa">Despesa (Saída)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">Data</Label>
                  <Input id="date" type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: "pago" | "pendente") => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago">Pago / Recebido</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar Lançamento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(saldoAtual)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas (Pagas)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalReceitas)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas (Pagas)</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalDespesas)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(pendenteReceber)}</div>
          </CardContent>
        </Card>
      </div>

      {/* TABELA DE LANÇAMENTOS */}
      <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Histórico de Transações</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar lançamento..." className="pl-9 bg-background/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow key="loading">
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow key="empty">
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {t.type === 'receita' ? <ArrowUpCircle className="w-4 h-4 text-emerald-500"/> : <ArrowDownCircle className="w-4 h-4 text-red-500"/>}
                          {t.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground text-sm">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'pago' ? "default" : "secondary"} className={t.status === 'pago' ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"}>
                          {t.status === 'pago' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${t.type === 'receita' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.type === 'receita' ? '+' : '-'}{formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>
                        {/* Botão atualizado para abrir modal */}
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => requestDeleteTransaction(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- MODAL DE EXCLUSÃO (NOVO) --- */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-red-500/20 bg-card">
          <DialogHeader className="items-center text-center">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl">Excluir Lançamento?</DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              variant="destructive" 
              className="w-full font-semibold shadow-sm" 
              onClick={confirmDeleteTransaction}
            >
              Confirmar Exclusão
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}