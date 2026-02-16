"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Briefcase, Users, CheckCircle, Loader2, MapPin, TrendingUp } from "lucide-react";
import { 
  ComposedChart, Area, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend 
} from "recharts";
import { Badge } from "@/components/ui/badge";

// --- HIGHCHARTS BASE ---
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

export default function DashboardPage() {
  const { theme } = useTheme();
  const supabase = createClient();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [topology, setTopology] = useState<any>(null);
  const [mapData, setMapData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    faturamento: 0,
    projetosAtivos: 0,
    totalClientes: 0,
    tarefasPendentes: 0,
  });

  // --- PALETA DE CORES AJUSTADA PARA MÁXIMA VISIBILIDADE ---
  const colors = useMemo(() => ({
    receita: "#10b981", 
    lucro: "#10b981", 
    grid: isDark ? "#1f1f23" : "#e2e8f0", 
    text: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#0f172a" : "#ffffff",
    
    // CORES DO MAPA:
    // mapBase: Cor para estados sem clientes
    mapBase: isDark ? "#2d3748" : "#d1d5db", // Cinza azulado escuro no dark | Cinza médio bem visível no light
    // mapActive: Verde da Fluxo Digital
    mapActive: "#10b981", 
    // mapBorder: Garante o contorno dos estados
    mapBorder: isDark ? "#1a202c" : "#ffffff", 
    mapHover: "#34d399"
  }), [isDark]);

  useEffect(() => {
    async function initDashboard() {
      try {
        setLoading(true);

        // 1. Inicialização do Mapa (Highcharts)
        if (typeof window !== "undefined") {
          const MapModule = await import("highcharts/modules/map");
          const initMap = MapModule.default || MapModule;
          if (typeof initMap === 'function') (initMap as any)(Highcharts);
        }
        
        const topoRes = await fetch("https://code.highcharts.com/mapdata/countries/br/br-all.topo.json");
        const topoJson = await topoRes.json();
        setTopology(topoJson);

        // --- BUSCA DE DADOS NA TABELA TRANSACTIONS ---
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [clientsRes, projectsRes, tasksRes, transRes] = await Promise.all([
          supabase.from("clients").select("state").eq('user_id', user.id),
          supabase.from("projects").select("status").eq('user_id', user.id),
          supabase.from("agency_tasks").select("status").eq('user_id', user.id),
          supabase.from("transactions").select("amount, type, date").eq('user_id', user.id)
        ]);

        const financeiro = transRes.data || [];
        const agora = new Date();
        const anoAtual = agora.getFullYear();

        // 2. Cálculo do Faturamento do Mês Atual (Card)
        let faturamentoMes = 0;
        financeiro.forEach((f: any) => {
          const dataTrans = new Date(f.date);
          if (
            f.type === 'receita' && 
            dataTrans.getMonth() === agora.getMonth() && 
            dataTrans.getFullYear() === anoAtual
          ) {
            faturamentoMes += Number(f.amount);
          }
        });

        setStats({
          faturamento: faturamentoMes,
          projetosAtivos: (projectsRes.data || []).filter(p => p.status !== 'concluido').length,
          totalClientes: (clientsRes.data || []).length,
          tarefasPendentes: (tasksRes.data || []).filter(t => t.status !== 'done').length,
        });

        // 3. Processamento do Gráfico Mensal (Janeiro a Dezembro)
        const mesesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const dadosGrafico = mesesLabels.map((mes, index) => {
          let receitaMensal = 0;
          let lucroMensal = 0;

          financeiro.forEach((t: any) => {
            const d = new Date(t.date);
            // Filtra as transações que pertencem ao mês do loop e ao ano vigente
            if (d.getMonth() === index && d.getFullYear() === anoAtual) {
              const valor = Number(t.amount) || 0;
              if (t.type === 'receita') {
                receitaMensal += valor;
                lucroMensal += valor;
              } else if (t.type === 'despesa') {
                lucroMensal -= valor;
              }
            }
          });

          return { name: mes, receita: receitaMensal, lucro: lucroMensal };
        });

        setChartData(dadosGrafico);

        // 4. Processamento do Mapa
        const counts: Record<string, number> = {};
        (clientsRes.data || []).forEach(c => {
          if (c.state) {
            let uf = c.state.trim().toLowerCase();
            if (!uf.startsWith('br-') && uf.length === 2) uf = `br-${uf}`;
            counts[uf] = (counts[uf] || 0) + 1;
          }
        });
        setMapData(Object.entries(counts).map(([key, val]) => [key, val]));

      } catch (e) {
        console.error("Erro ao carregar dados do dashboard:", e);
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, [supabase]);

  const highchartsOptions = useMemo(() => ({
    chart: {
      map: topology,
      backgroundColor: 'transparent',
      height: 350,
      spacing: [0, 0, 0, 0]
    },
    title: { text: '' },
    credits: { enabled: false },
    legend: { enabled: false },
    mapNavigation: { enabled: false },
    colorAxis: {
      min: 0,
      stops: [
        [0, colors.mapBase], // Cor definida no useMemo
        [0.01, colors.mapActive],
        [1, colors.mapActive]
      ]
    },
    tooltip: {
      backgroundColor: colors.tooltipBg,
      borderColor: colors.grid,
      style: { color: colors.text },
      pointFormat: '<b>{point.name}</b>: {point.value} clientes'
    },
    series: [{
      data: mapData,
      name: 'Clientes',
      joinBy: 'hc-key',
      allAreas: true,
      borderColor: colors.mapBorder,
      borderWidth: 1, // Borda um pouco mais grossa para ajudar na visibilidade
      states: {
        hover: { color: colors.mapHover }
      },
      dataLabels: { enabled: false }
    }]
  }), [topology, mapData, colors]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Painel Administrativo - Fluxo Digital</p>
        </div>
        <Badge variant="outline" className="gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Online
        </Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Receita (Mês)" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.faturamento)} icon={<DollarSign className="text-emerald-500" />} />
        <StatCard title="Projetos Ativos" value={stats.projetosAtivos} icon={<Briefcase className="text-blue-500" />} />
        <StatCard title="Total Clientes" value={stats.totalClientes} icon={<Users className="text-purple-500" />} />
        <StatCard title="Pendências" value={stats.tarefasPendentes} icon={<CheckCircle className="text-orange-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Performance Financeira</CardTitle></CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="name" stroke={colors.text} fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke={colors.text} fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.grid, borderRadius: '8px' }} />
                <Area type="monotone" dataKey="receita" fill={colors.receita} stroke={colors.receita} fillOpacity={0.1} />
                <Line type="monotone" dataKey="lucro" stroke={colors.lucro} strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MAPA REVISADO PARA MODO LIGHT/DARK */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur border-border/50 relative overflow-hidden">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-500" /> Presença Nacional</CardTitle></CardHeader>
          <div className="h-[350px] flex items-center justify-center p-2">
             {topology && <HighchartsReact highcharts={Highcharts} constructorType={'mapChart'} options={highchartsOptions} />}
          </div>
          {/* Legenda com cores dinâmicas */}
          <div className="absolute bottom-4 left-4 bg-background/90 p-2 rounded border border-border/50 text-[10px]">
             <div className="flex gap-3 font-medium">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.mapBase }}></div> Sem Clientes</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.mapActive }}></div> Com Clientes</span>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-accent/50 flex items-center justify-center">{icon}</div>
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div><p className="text-[10px] text-muted-foreground uppercase mt-1 opacity-50 tracking-widest">Fluxo Digital</p></CardContent>
    </Card>
  );
}