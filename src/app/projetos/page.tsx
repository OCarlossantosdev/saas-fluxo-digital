"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import { 
  Plus, Loader2, MoreHorizontal, Trash2, Building2, Clock, Briefcase,
  Edit, ChevronRight, Activity, ArrowUpRight, CheckCircle2, AlertCircle, Layout, BarChart3, ChevronLeft, PieChart as PieChartIcon, Users, AlertTriangle
} from "lucide-react";

// --- TIPAGENS ---
interface Project {
  id: string;
  title: string;
  description: string;
  status: "pendente" | "andamento" | "revisao" | "concluido";
  priority: "baixa" | "media" | "alta";
  deadline: string;
  client_id: string | null;
}

interface Client {
  id: string;
  company_name: string;
}

interface TeamStat {
  name: string;
  count: number;
}

interface SystemUser {
  id: string;
  name: string;
}

const KANBAN_COLUMNS = [
  { id: "pendente", title: "Pendente", color: "bg-slate-500", stroke: "#64748b" },
  { id: "andamento", title: "Andamento", color: "bg-blue-500", stroke: "#3b82f6" },
  { id: "revisao", title: "Revisão", color: "bg-orange-500", stroke: "#f97316" },
  { id: "concluido", title: "Concluído", color: "bg-emerald-500", stroke: "#10b981" },
];

const projectChartData = [
  { name: "Jan", criados: 4, concluidos: 2 },
  { name: "Fev", criados: 7, concluidos: 3 },
  { name: "Mar", criados: 5, concluidos: 5 },
  { name: "Abr", criados: 8, concluidos: 6 },
  { name: "Mai", criados: 12, concluidos: 9 },
  { name: "Jun", criados: 6, concluidos: 10 },
];

// Dados para o Novo Gráfico "Project Analytics" (Curva Suave)
const analyticsCurveData = [
  { name: "Jan", performance: 4000 },
  { name: "Fev", performance: 3000 },
  { name: "Mar", performance: 2000 },
  { name: "Abr", performance: 2780 },
  { name: "Mai", performance: 1890 },
  { name: "Jun", performance: 2390 },
  { name: "Jul", performance: 3490 },
];

// Estilo Global da Scrollbar Fina
const customScrollbarClass = "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30";

export default function ProjetosPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isBrowser, setIsBrowser] = useState(false);

  const [viewMode, setViewMode] = useState<"kanban" | "analytics">("kanban");
  const [collapsedCols, setCollapsedCols] = useState<string[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("clientes");
  
  // Estados para modais
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client_id: "none",
    deadline: "",
    status: "pendente" as Project["status"],
    priority: "media" as Project["priority"],
  });

  useEffect(() => {
    setIsBrowser(true);
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const { data: projectsData } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    const { data: clientsData } = await supabase.from("clients").select("id, company_name").order("company_name", { ascending: true });
    
    const { data: usersData, error: usersError } = await supabase.from("profiles").select("id, name");
    if (usersError) {
      console.warn("Aviso: Tabela 'profiles' não encontrada. Ignorando usuários.");
      setSystemUsers([]); 
    } else if (usersData) {
      setSystemUsers(usersData);
    }
    
    const { data: membersData } = await supabase.from("project_members").select("*");
    
    if (projectsData) setProjects(projectsData);
    if (clientsData) setClients(clientsData);
    
    if (membersData) {
      const counts: Record<string, number> = {};
      membersData.forEach((m: any) => {
        counts[m.name] = (counts[m.name] || 0) + 1;
      });
      setTeamStats(Object.keys(counts).map(name => ({ name, count: counts[name] })).sort((a, b) => b.count - a.count));
    }
    
    setIsLoading(false);
  }

  function openEditModal(project: Project) {
    setEditingProjectId(project.id);
    setFormData({
      title: project.title,
      description: project.description || "",
      client_id: project.client_id || "none",
      deadline: project.deadline || "",
      status: project.status,
      priority: project.priority || "media",
    });
    setIsDialogOpen(true);
  }

  function openNewProjectModal() {
    setEditingProjectId(null);
    setFormData({ title: "", description: "", client_id: "none", deadline: "", status: "pendente", priority: "media" });
    setIsDialogOpen(true);
  }

  function handleOpenChange(open: boolean) {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProjectId(null);
      setFormData({ title: "", description: "", client_id: "none", deadline: "", status: "pendente", priority: "media" });
    }
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault(); 
    if (!formData.title) return alert("Preencha o título!");

    setIsSaving(true);
    const insertData: any = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      deadline: formData.deadline || null,
      client_id: formData.client_id !== "none" ? formData.client_id : null,
    };

    if (editingProjectId) {
      await supabase.from("projects").update(insertData).eq("id", editingProjectId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      insertData.user_id = user?.id;
      await supabase.from("projects").insert([insertData]);
    }

    fetchData();
    handleOpenChange(false);
    setIsSaving(false);
  }

  // --- FUNÇÕES DE EXCLUSÃO ATUALIZADAS ---
  function requestDeleteProject(id: string) {
    setProjectToDeleteId(id);
    setIsDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!projectToDeleteId) return;
    
    setIsSaving(true);
    const { error } = await supabase.from("projects").delete().eq("id", projectToDeleteId);
    
    if (!error) {
      setProjects(projects.filter((p) => p.id !== projectToDeleteId));
    }
    
    setIsDeleteDialogOpen(false);
    setProjectToDeleteId(null);
    setIsSaving(false);
  }

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return; 
    if (destination.droppableId === source.droppableId && destination.index === source.index) return; 

    const newStatus = destination.droppableId as Project["status"];
    
    setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, status: newStatus } : p));
    await supabase.from("projects").update({ status: newStatus }).eq("id", draggableId);
  };

  const toggleColumn = (colId: string) => {
    setCollapsedCols(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Projeto Interno";
    return clients.find(c => c.id === clientId)?.company_name || "Desconhecido";
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'alta': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'media': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'baixa': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pendente': return <Layout className="w-3.5 h-3.5 text-slate-500" />;
      case 'andamento': return <Activity className="w-3.5 h-3.5 text-blue-500" />;
      case 'revisao': return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
      case 'concluido': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default: return <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };
  
  const getStatusBg = (status: string) => {
    switch(status) {
      case 'pendente': return 'bg-slate-500/10 border border-slate-500/20';
      case 'andamento': return 'bg-blue-500/10 border border-blue-500/20';
      case 'revisao': return 'bg-orange-500/10 border border-orange-500/20';
      case 'concluido': return 'bg-emerald-500/10 border border-emerald-500/20';
      default: return 'bg-muted border border-border';
    }
  };

  const activeProjects = activeTab === "clientes" ? projects.filter(p => p.client_id !== null) : projects.filter(p => p.client_id === null);
  
  const priorityWeight: any = { alta: 3, media: 2, baixa: 1 };
  const sortedProjectsList = [...activeProjects].sort((a, b) => {
    const aOverdue = a.deadline && new Date(a.deadline) < new Date() && a.status !== 'concluido' ? 1 : 0;
    const bOverdue = b.deadline && new Date(b.deadline) < new Date() && b.status !== 'concluido' ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue; 
    return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
  });
  
  const totalProjetos = activeProjects.length;
  const concluidos = activeProjects.filter(p => p.status === "concluido").length;
  const andamento = activeProjects.filter(p => p.status === "andamento").length;
  const pendentes = activeProjects.filter(p => p.status === "pendente").length;
  const revisao = activeProjects.filter(p => p.status === "revisao").length;

  // Dados para o Gráfico Donut com cores exatas dos Cards
  const pieProgressData = [
    { name: "Concluído", value: concluidos, color: "#10b981" }, // Emerald 500
    { name: "Revisão", value: revisao, color: "#f97316" }, // Orange 500
    { name: "Andamento", value: andamento, color: "#3b82f6" }, // Blue 500
    { name: "Pendente", value: pendentes, color: "#64748b" }, // Slate 500
  ].filter(d => d.value > 0);

  const progressPercent = totalProjetos === 0 ? 0 : Math.round((concluidos / totalProjetos) * 100);

  const isAnalyticsVisible = collapsedCols.length > 0;
  const isAllOpen = collapsedCols.length === 0;

  const showKanban = () => setCollapsedCols([]); 
  const showAnalytics = () => setCollapsedCols(KANBAN_COLUMNS.map(c => c.id)); 

  if (!isBrowser) return null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 h-full flex flex-col overflow-hidden">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Projetos</h2>
          <p className="text-muted-foreground">Arraste os cards ou acompanhe as métricas globais.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
            <Button 
              variant={isAllOpen ? 'default' : 'ghost'} 
              size="sm" 
              className={`h-8 ${isAllOpen ? 'shadow-sm' : 'text-muted-foreground'}`}
              onClick={showKanban}
            >
              <Layout className="w-4 h-4 mr-2" /> Quadro Kanban
            </Button>
            <Button 
              variant={!isAllOpen ? 'default' : 'ghost'} 
              size="sm" 
              className={`h-8 ${!isAllOpen ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
              onClick={showAnalytics}
            >
              <BarChart3 className="w-4 h-4 mr-2" /> Analytics Global
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto gap-2 font-semibold shadow-md hover:shadow-lg transition-all" onClick={openNewProjectModal}>
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>{editingProjectId ? "Editar Projeto" : "Criar Novo Projeto"}</DialogTitle>
                <DialogDescription>Ajuste os detalhes, prazo e prioridade.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveProject} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Nome do Projeto</Label>
                  <Input required id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Vínculo (Cliente ou Agência)</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="font-semibold text-primary">Nenhum (Projeto Interno)</SelectItem>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status Inicial</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="andamento">Andamento</SelectItem>
                        <SelectItem value="revisao">Revisão</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData({...formData, priority: value})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta"><span className="text-red-500 font-medium">Alta</span></SelectItem>
                        <SelectItem value="media"><span className="text-orange-500 font-medium">Média</span></SelectItem>
                        <SelectItem value="baixa"><span className="text-blue-500 font-medium">Baixa</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Prazo</Label>
                    <Input id="deadline" type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* MODAL DE EXCLUSÃO (NOVO) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border-red-500/20 bg-card">
          <DialogHeader className="items-center text-center">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl">Excluir Projeto?</DialogTitle>
            <DialogDescription className="text-sm">
              Esta ação não pode ser desfeita. O projeto e todos os seus dados internos serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              variant="destructive" 
              className="w-full font-semibold shadow-sm" 
              onClick={confirmDelete}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Confirmar Exclusão
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="clientes" onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 max-w-[400px] shrink-0">
          <TabsTrigger value="clientes">Projetos de Clientes</TabsTrigger>
          <TabsTrigger value="internos">Projetos Internos</TabsTrigger>
        </TabsList>
        
        <div className="flex-1 flex mt-4 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex w-full h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex w-full h-full gap-6 transition-all duration-500 min-h-0 overflow-hidden">
              
              {/* --- LADO ESQUERDO: KANBAN BOARD --- */}
              <div className={`flex gap-4 h-full transition-all duration-500
                ${isAnalyticsVisible ? 'flex-none w-auto max-w-[50%]' : 'flex-1'}
                overflow-x-auto pb-2 ${customScrollbarClass}
              `}>
                <DragDropContext onDragEnd={onDragEnd}>
                  {KANBAN_COLUMNS.map((column) => {
                    const columnProjects = activeProjects.filter((p) => p.status === column.id);
                    const isCollapsed = collapsedCols.includes(column.id);

                    if (isCollapsed) {
                      return (
                        <Droppable key={column.id} droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`flex flex-col flex-shrink-0 bg-muted/20 rounded-xl border items-center py-4 transition-all duration-300 cursor-pointer hover:bg-muted/40 h-full
                                ${snapshot.isDraggingOver ? 'w-[120px] bg-primary/20 border-primary ring-2 ring-primary scale-105 shadow-xl' : 'w-[60px] border-border/50'}
                              `}
                              onClick={() => toggleColumn(column.id)}
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8 mb-4 pointer-events-none">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <div className="flex items-center gap-2 -rotate-90 mt-12 whitespace-nowrap">
                                <div className={`w-2 h-2 rounded-full ${column.color}`} />
                                <span className="font-semibold text-sm tracking-wider text-muted-foreground uppercase">{column.title}</span>
                              </div>
                              <Badge variant="secondary" className="mt-16 text-[10px]">{columnProjects.length}</Badge>
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      );
                    }

                    return (
                      <Droppable key={column.id} droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div 
                            className={`flex flex-col flex-shrink-0 rounded-xl border transition-all duration-300 h-full flex-col
                              ${snapshot.isDraggingOver ? 'w-[350px] bg-primary/5 border-primary ring-2 ring-primary/50 shadow-xl' : 'w-[320px] bg-muted/30 border-border/50'}
                            `}
                          >
                            <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/30 shrink-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                                <h3 className="font-semibold text-sm">{column.title}</h3>
                                <Badge variant="secondary" className="text-xs ml-1 bg-background">{columnProjects.length}</Badge>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted" onClick={() => toggleColumn(column.id)}>
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            </div>

                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className={`p-3 flex-1 overflow-y-auto space-y-3 pr-1 ${customScrollbarClass}`}
                            >
                              {columnProjects.map((project, index) => {
                                const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'concluido';
                                return (
                                  <Draggable key={project.id} draggableId={project.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{ ...provided.draggableProps.style }}
                                        className={snapshot.isDragging ? "z-50 relative" : ""}
                                      >
                                        <Card 
                                          onClick={() => router.push(`/projetos/${project.id}`)}
                                          className={`bg-card shadow-sm border-border/50 relative group cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-primary/50 transition-all duration-300
                                            ${snapshot.isDragging ? 'shadow-2xl ring-4 ring-primary scale-110 rotate-3 opacity-100' : ''}
                                          `}
                                        >
                                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur"><MoreHorizontal className="h-4 w-4" /></Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-[160px]">
                                                <DropdownMenuItem className="cursor-pointer" onClick={() => openEditModal(project)}>
                                                  <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> Editar Projeto
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={() => requestDeleteProject(project.id)}>
                                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>

                                          <CardHeader className="p-4 pb-2 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(project.priority)}`}>
                                                {project.priority}
                                              </span>
                                              {isOverdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white animate-pulse">Atrasado</span>}
                                            </div>
                                            <CardTitle className="text-sm font-semibold leading-tight pr-6">{project.title}</CardTitle>
                                          </CardHeader>
                                          
                                          <CardFooter className="p-4 pt-2 flex flex-col items-start gap-2 border-t border-border/30 mt-2">
                                            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md w-full ${project.client_id ? 'bg-muted/50 text-foreground/80' : 'bg-primary/10 text-primary'}`}>
                                              {project.client_id ? <Building2 className="w-3.5 h-3.5 text-primary shrink-0" /> : <Briefcase className="w-3.5 h-3.5 shrink-0" />}
                                              <span className="truncate">{getClientName(project.client_id)}</span>
                                            </div>
                                          </CardFooter>
                                        </Card>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </DragDropContext>
              </div>

              {/* ======================================================================
                  LADO DIREITO: DASHBOARD ANALYTICS 
                  ====================================================================== */}
              {isAnalyticsVisible && (
                <div className="flex-1 flex flex-col min-w-[300px] h-full overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-right-8 pr-1">
                  
                  {/* CARDS SUPERIORES */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 flex-none mb-4">
                    <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative">
                      <div className="absolute top-2 right-2 bg-background/20 p-1.5 rounded-full"><ArrowUpRight className="w-3 h-3" /></div>
                      <CardContent className="p-4">
                        <p className="text-xs font-medium opacity-90">Total Projects</p>
                        <h3 className="text-3xl font-bold mt-1">{totalProjetos}</h3>
                        <p className="text-[10px] mt-2 bg-background/20 w-fit px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Registrados</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-border shadow-sm relative">
                      <div className="absolute top-2 right-2 border p-1.5 rounded-full"><ArrowUpRight className="w-3 h-3 text-muted-foreground" /></div>
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">Ended Projects</p>
                        <h3 className="text-3xl font-bold mt-1 text-primary">{concluidos}</h3>
                        <p className="text-[10px] mt-2 text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded">Entregues</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-border shadow-sm relative">
                      <div className="absolute top-2 right-2 border p-1.5 rounded-full"><ArrowUpRight className="w-3 h-3 text-muted-foreground" /></div>
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">Running Projects</p>
                        <h3 className="text-3xl font-bold mt-1 text-primary">{andamento}</h3>
                        <p className="text-[10px] mt-2 text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded">Ativos</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-border shadow-sm relative">
                      <div className="absolute top-2 right-2 border p-1.5 rounded-full"><ArrowUpRight className="w-3 h-3 text-muted-foreground" /></div>
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">Pending Project</p>
                        <h3 className="text-3xl font-bold mt-1 text-foreground">{pendentes}</h3>
                        <p className="text-[10px] mt-2 text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded">Na Fila</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
                    
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                      
                      {/* GRÁFICO DE ÁREA */}
                      <Card className="border-border shadow-sm flex-1 flex flex-col min-h-0">
                        <CardHeader className="pb-0 flex-none flex flex-row items-center justify-between">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">Fluxo de Entregas</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col pt-2 min-h-0">
                          <div className="flex justify-between items-end mb-2 px-2 flex-none">
                             <div>
                                <p className="text-3xl font-bold text-foreground">{totalProjetos} <span className="text-sm font-normal text-muted-foreground">Criados</span></p>
                             </div>
                             <div className="text-right">
                                <p className="text-2xl font-bold text-primary">{concluidos} <span className="text-sm font-normal text-muted-foreground">Concluídos</span></p>
                             </div>
                          </div>
                          <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorCriados" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorConcluidos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} stroke="#888888" dy={10} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="criados" name="Criados" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCriados)" />
                                <Area type="monotone" dataKey="concluidos" name="Concluídos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConcluidos)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                        {/* PROGRESSO DO PROJETO (Ajustado: Círculo Gigante + Texto Pequeno) */}
                        <Card className="border-border shadow-sm flex flex-col min-h-0">
                          <CardHeader className="pb-0 flex-none">
                            <CardTitle className="text-sm font-semibold">Project Progress</CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col items-center justify-center relative min-h-0 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieProgressData.length > 0 ? pieProgressData : [{ value: 1, color: "hsl(var(--muted))" }]}
                                  cx="50%" cy="50%" innerRadius="75%" outerRadius="90%" paddingAngle={2} dataKey="value" stroke="none"
                                >
                                  {(pieProgressData.length > 0 ? pieProgressData : [{ value: 1, color: "hsl(var(--muted))" }]).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                {pieProgressData.length > 0 && <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />}
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-8">
                              <h2 className="text-xl font-bold">{pieProgressData.length > 0 ? Math.round((concluidos / totalProjetos) * 100) : 0}%</h2>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ended</p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* GRÁFICO DE ÁREA "Incredible" */}
                        <Card className="border-border shadow-sm flex flex-col min-h-0">
                          <CardHeader className="pb-0 flex-none">
                            <CardTitle className="text-sm font-semibold">Project Analytics</CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1 pt-2 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analyticsCurveData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.6}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} stroke="#888888" dy={10} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="performance" stroke="#f97316" strokeWidth={3} fill="url(#colorPerformance)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>

                    </div>

                    {/* Divisão Direita: LISTA DE PROJETOS */}
                    <div className="xl:w-[320px] flex-none h-full flex flex-col">
                      <Card className="border-border shadow-sm flex flex-col h-full overflow-hidden">
                        <CardHeader className="py-3 px-4 flex-none flex flex-row items-center justify-between border-b border-border/30">
                          <CardTitle className="text-sm font-semibold">Project List</CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 rounded-full text-[10px] px-2.5 shadow-sm hover:bg-primary hover:text-primary-foreground transition-all" 
                            onClick={openNewProjectModal}
                          >
                            <Plus className="w-3 h-3 mr-1" /> New
                          </Button>
                        </CardHeader>
                        
                        <CardContent className={`flex-1 overflow-y-auto p-2 ${customScrollbarClass}`}>
                          <div className="space-y-1">
                            {sortedProjectsList.map(project => {
                              const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'concluido';
                              return(
                              <div 
                                key={project.id} 
                                className="flex items-center gap-2.5 group cursor-pointer hover:bg-muted/40 p-2 rounded-md transition-colors border border-transparent hover:border-border/40" 
                                onClick={() => router.push(`/projetos/${project.id}`)}
                              >
                                <div className={`w-8 h-8 rounded-md shrink-0 flex items-center justify-center ${getStatusBg(project.status)}`}>
                                  {getStatusIcon(project.status)}
                                </div>
                                
                                <div className="flex flex-col overflow-hidden w-full">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[13px] font-bold truncate group-hover:text-primary transition-colors leading-none">
                                      {project.title}
                                    </span>
                                    {isOverdue && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Atrasado" />}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 border-none uppercase ${getPriorityColor(project.priority)}`}>
                                      {project.priority}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground truncate leading-none">
                                      {project.deadline ? `Due: ${new Date(new Date(project.deadline).getTime() + new Date(project.deadline).getTimezoneOffset() * 60000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : "No deadline"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )})}
                            
                            {sortedProjectsList.length === 0 && (
                              <div className="text-center text-xs text-muted-foreground py-8">
                                Nenhum projeto encontrado.
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </Tabs>
      
    </div>
  );
}