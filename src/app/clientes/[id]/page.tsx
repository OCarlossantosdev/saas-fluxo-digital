"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import { createClient } from "@/lib/supabase";
import { formatDistanceToNow, format, subDays, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, Building2, Calendar as CalendarIcon, DollarSign, TrendingUp, Target, Briefcase, 
  Clock, ExternalLink, Mail, Phone, MapPin, Loader2, Plus, Wallet, ArrowUpCircle, ArrowDownCircle, Edit, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; 
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from "recharts";
import { DateRange } from "react-day-picker";

// --- TIPAGENS ---
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  contract_value: number;
  created_at: string;
  state?: string;
  city?: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  deadline: string;
  priority: string;
  created_at: string;
}

interface Goal {
  id: string;
  name: string;
  current_value: number;
  target_value: number;
  unit: string;
  completed_at?: string | null;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'investimento' | 'receita' | 'custo';
  date: string;
}

export default function ClienteDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  
  const [clientId, setClientId] = useState<string>("");
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Filtro de Data
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  });

  // Forms States
  const [goalForm, setGoalForm] = useState({ name: "", current: "", target: "" }); // REMOVIDO UNIT
  const [transactionForm, setTransactionForm] = useState({ description: "", amount: "", type: "investimento", date: format(new Date(), "yyyy-MM-dd") });

  useEffect(() => {
    params.then((resolvedParams) => {
      setClientId(resolvedParams.id);
      fetchClientData(resolvedParams.id);
    });
  }, [params]);

  async function fetchClientData(id: string) {
    setLoading(true);
    
    const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();
    const { data: projectsData } = await supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: true });
    const { data: goalsData } = await supabase.from("client_goals").select("*").eq("client_id", id);
    const { data: transData } = await supabase.from("client_transactions").select("*").eq("client_id", id).order("date", { ascending: true });

    if (clientData) setClient(clientData);
    if (projectsData) setProjects(projectsData);
    if (goalsData) setGoals(goalsData);
    if (transData) setTransactions(transData);
    
    setLoading(false);
  }

  // --- ACTIONS: GOALS (Criar e Editar) ---
  function openNewGoalModal() {
    setEditingGoalId(null);
    setGoalForm({ name: "", current: "", target: "" }); // REMOVIDO UNIT
    setIsGoalOpen(true);
  }

  function openEditGoalModal(goal: Goal) {
    setEditingGoalId(goal.id);
    setGoalForm({
      name: goal.name,
      current: goal.current_value.toString(),
      target: goal.target_value.toString(),
    });
    setIsGoalOpen(true);
  }

  async function handleSaveGoal() {
    if (!goalForm.name || !goalForm.target) return;

    const currentVal = Number(goalForm.current);
    const targetVal = Number(goalForm.target);
    const isCompleted = currentVal >= targetVal; 
    const completedAt = isCompleted ? new Date().toISOString() : null;

    if (editingGoalId) {
        await supabase.from("client_goals").update({
            name: goalForm.name,
            current_value: currentVal,
            target_value: targetVal,
            ...(isCompleted ? { completed_at: completedAt } : {}) 
        }).eq("id", editingGoalId);
    } else {
        await supabase.from("client_goals").insert([{
            client_id: clientId,
            name: goalForm.name,
            current_value: currentVal,
            target_value: targetVal,
            completed_at: completedAt
        }]);
    }

    fetchClientData(clientId);
    setIsGoalOpen(false);
  }

  async function handleAddTransaction() {
    if (!transactionForm.description || !transactionForm.amount) return;
    await supabase.from("client_transactions").insert([{
      client_id: clientId,
      description: transactionForm.description,
      amount: Number(transactionForm.amount.replace(",", ".")),
      type: transactionForm.type,
      date: transactionForm.date
    }]);
    fetchClientData(clientId);
    setIsTransactionOpen(false);
    setTransactionForm({ description: "", amount: "", type: "investimento", date: format(new Date(), "yyyy-MM-dd") });
  }

  // --- ENGINE DE DADOS DO GRÁFICO (BI) ---
  const chartDataMap = new Map();
  const getKey = (date: Date) => format(date, "MM/yyyy");

  transactions.forEach(t => {
    const date = parseISO(t.date);
    if (dateRange?.from && date < dateRange.from) return;
    if (dateRange?.to && date > dateRange.to) return;

    const key = getKey(date);
    if (!chartDataMap.has(key)) chartDataMap.set(key, { name: format(date, "MMM/yy", { locale: ptBR }), Investimento: 0, Retorno: 0, Projetos: 0, Metas: 0, sortDate: date });
    
    const entry = chartDataMap.get(key);
    if (t.type === 'investimento') entry.Investimento += t.amount;
    if (t.type === 'receita') entry.Retorno += t.amount;
  });

  projects.forEach(p => {
    const date = new Date(p.created_at);
    if (dateRange?.from && date < dateRange.from) return;
    if (dateRange?.to && date > dateRange.to) return;

    const key = getKey(date);
    if (!chartDataMap.has(key)) chartDataMap.set(key, { name: format(date, "MMM/yy", { locale: ptBR }), Investimento: 0, Retorno: 0, Projetos: 0, Metas: 0, sortDate: date });
    
    const entry = chartDataMap.get(key);
    entry.Projetos += 1;
  });

  goals.forEach(g => {
    if (!g.completed_at) return;
    const date = new Date(g.completed_at);
    if (dateRange?.from && date < dateRange.from) return;
    if (dateRange?.to && date > dateRange.to) return;

    const key = getKey(date);
    if (!chartDataMap.has(key)) chartDataMap.set(key, { name: format(date, "MMM/yy", { locale: ptBR }), Investimento: 0, Retorno: 0, Projetos: 0, Metas: 0, sortDate: date });
    
    const entry = chartDataMap.get(key);
    entry.Metas += 1;
  });

  const chartData = Array.from(chartDataMap.values()).sort((a: any, b: any) => a.sortDate - b.sortDate);

  const filteredTransactions = transactions.filter(t => {
    if (!dateRange?.from || !dateRange?.to) return true;
    const tDate = parseISO(t.date);
    return isWithinInterval(tDate, { start: dateRange.from, end: dateRange.to });
  });

  const totalInvestido = filteredTransactions.filter(t => t.type === 'investimento').reduce((acc, curr) => acc + curr.amount, 0);
  const totalReceita = filteredTransactions.filter(t => t.type === 'receita').reduce((acc, curr) => acc + curr.amount, 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'concluido': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'andamento': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'revisao': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!client) return <div className="p-8">Cliente não encontrado.</div>;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      
      {/* --- CABEÇALHO --- */}
      <div className="flex-none p-4 md:p-6 pb-2">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-9 w-9 rounded-full shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 truncate">
              {client.company_name}
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/5 font-normal shrink-0">
                Ativo
              </Badge>
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 truncate">
              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> {client.name}</span>
              <span className="hidden sm:inline w-1 h-1 rounded-full bg-border"></span>
              <span className="hidden sm:flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5"/> 
                Fidelidade: {formatDistanceToNow(new Date(client.created_at), { locale: ptBR })}
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button variant="outline" className="hidden md:flex gap-2">
              <ExternalLink className="w-4 h-4" /> Drive
            </Button>
            
            {/* Modal de Transação */}
            <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Wallet className="w-4 h-4" /> <span className="hidden sm:inline">Transação</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Transação Financeira</DialogTitle>
                  <DialogDescription>Registre investimentos em ads ou receitas geradas.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={transactionForm.type} onValueChange={(val: any) => setTransactionForm({...transactionForm, type: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investimento">Investimento (Ads)</SelectItem>
                          <SelectItem value="receita">Receita Gerada</SelectItem>
                          <SelectItem value="custo">Despesa Extra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input placeholder="0.00" value={transactionForm.amount} onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input placeholder="Ex: Meta Ads Semanal" value={transactionForm.description} onChange={e => setTransactionForm({...transactionForm, description: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={transactionForm.date} onChange={e => setTransactionForm({...transactionForm, date: e.target.value})} />
                  </div>
                  <Button onClick={handleAddTransaction} className="w-full mt-2">Salvar Transação</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Separator className="mt-4" />
      </div>

      {/* --- CORPO FIXO (SEM SCROLL GERAL) --- */}
      <div className="flex-1 overflow-hidden p-4 md:p-6 pt-0 flex flex-col gap-4">
        
        {/* CARDS KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mensalidade Fixa</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(client.contract_value)}</div>
              <p className="text-xs text-muted-foreground mt-1">Recorrente mensal</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investido (Filtro)</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvestido)}</div>
              <p className="text-xs text-muted-foreground mt-1">Em Tráfego/Ads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita (Filtro)</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalReceita)}</div>
              <p className="text-xs text-muted-foreground mt-1">Retorno de Vendas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ROAS Estimado</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalInvestido > 0 ? (totalReceita / totalInvestido).toFixed(2) : "0"}x
              </div>
              <p className="text-xs text-muted-foreground mt-1">Retorno sobre Ads</p>
            </CardContent>
          </Card>
        </div>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          
          {/* ESQUERDA: GRÁFICO E METAS */}
          <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
            
            {/* GRÁFICO GERAL (EIXO DUPLO: R$ e QTD) */}
            <Card className="flex-1 flex flex-col min-h-[300px] border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Visão Geral 360º</CardTitle>
                  <CardDescription>Financeiro vs Projetos vs Metas Batidas</CardDescription>
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed gap-2 text-xs">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateRange?.from ? (
                        dateRange.to ? `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}` : format(dateRange.from, "dd/MM")
                      ) : "Selecione datas"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent className="flex-1 pl-0 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRetorno" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} stroke="#888888" dy={10} />
                    
                    {/* Eixo Esquerdo: Dinheiro */}
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={11} stroke="#888888" tickFormatter={(v) => `R$${v/1000}k`} />
                    
                    {/* Eixo Direito: Quantidade (Projetos/Metas) */}
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={11} stroke="#888888" />
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}/>
                    
                    <Area yAxisId="left" type="monotone" dataKey="Investimento" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorInvestido)" />
                    <Area yAxisId="left" type="monotone" dataKey="Retorno" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRetorno)" />
                    
                    <Line yAxisId="right" type="monotone" dataKey="Projetos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Bar yAxisId="right" dataKey="Metas" name="Metas Batidas" fill="#f59e0b" barSize={20} radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* METAS (GOALS) */}
            <Card className="flex-none border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Metas Ativas
                </CardTitle>
                
                <Dialog open={isGoalOpen} onOpenChange={setIsGoalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openNewGoalModal}><Plus className="w-4 h-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingGoalId ? "Editar Meta" : "Nova Meta"}</DialogTitle>
                      <DialogDescription>Defina um objetivo para acompanhar.</DialogDescription>
                    </DialogHeader>
                    {/* MODAL SEM UNIDADE */}
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da Meta</Label>
                        <Input placeholder="Ex: Leads Qualificados" value={goalForm.name} onChange={e => setGoalForm({...goalForm, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Atual</Label>
                          <Input type="number" placeholder="0" value={goalForm.current} onChange={e => setGoalForm({...goalForm, current: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Alvo</Label>
                          <Input type="number" placeholder="100" value={goalForm.target} onChange={e => setGoalForm({...goalForm, target: e.target.value})} />
                        </div>
                      </div>
                      <Button onClick={handleSaveGoal} className="w-full mt-2">Salvar Meta</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                {goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhuma meta definida.</p>
                ) : (
                  goals.map((goal) => {
                    const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
                    return (
                      <div key={goal.id} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{goal.name}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => openEditGoalModal(goal)}
                            >
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <span className="text-muted-foreground">
                            {goal.current_value} / {goal.target_value}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percent} className="h-2" />
                          <span className="text-[10px] font-bold w-8 text-right">{percent}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>

          {/* DIREITA: LISTA DE PROJETOS (Scroll Personalizado) */}
          <div className="lg:w-[350px] flex flex-col gap-4 min-h-0">
            
            {/* DADOS CADASTRAIS */}
            <Card className="flex-none">
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Cadastrais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pb-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
                  <span className="truncate">{client.email || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
                  <span>{client.phone || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
                  <span className="truncate">{client.city} - {client.state}</span>
                </div>
              </CardContent>
            </Card>

            {/* LISTA DE PROJETOS */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-border shadow-sm">
              <CardHeader className="py-3 shrink-0 bg-card z-10 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Projetos
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] h-5">{projects.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
                {projects.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-xs">
                    Nenhum projeto vinculado.
                  </div>
                ) : (
                  projects.map((project) => (
                    <div 
                      key={project.id} 
                      onClick={() => router.push(`/projetos/${project.id}`)}
                      className="p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{project.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 h-5 border-border/60">
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {project.deadline 
                            ? new Date(project.deadline).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) 
                            : "S/P"}
                        </div>
                        <span className="uppercase font-bold tracking-wider text-[8px] opacity-70">{project.priority}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}