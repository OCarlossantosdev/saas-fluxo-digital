"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { format, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle2, Clock, Calendar as CalendarIcon, 
  Plus, Search, AlertCircle, ChevronRight, 
  CheckSquare, Trash2, Calendar, User as UserIcon,
  Layout,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- TIPAGENS ---
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'baixa' | 'media' | 'alta';
  due_date: string | null;
  project_id: string | null;
  assigned_to: string | null;
}

interface Project {
  id: string;
  title: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function TarefasPage() {
  const supabase = createClient();
  
  // Estados de Dados
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de UI - ADICIONADO "completed"
  const [selectedFilter, setSelectedFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("today");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "media",
    project_id: "none",
    assigned_to: "none",
    due_date: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    
    const { data: tasksData } = await supabase
      .from("agency_tasks") 
      .select("*")
      .order("due_date", { ascending: true });
    
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, title");

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, name, email");

    if (tasksData) setTasks(tasksData);
    if (projectsData) setProjects(projectsData);
    if (usersData) setUsers(usersData);
    
    setIsLoading(false);
  }

  // --- ACTIONS ---
  async function handleAddTask() {
    if (!newTask.title) return;

    const { error } = await supabase.from("agency_tasks").insert([{
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      project_id: newTask.project_id !== "none" ? newTask.project_id : null,
      assigned_to: newTask.assigned_to !== "none" ? newTask.assigned_to : null,
      due_date: newTask.due_date || null,
      status: "todo"
    }]);

    if (!error) {
      fetchData();
      setIsDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "media", project_id: "none", assigned_to: "none", due_date: "" });
    }
  }

  async function toggleTaskStatus(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await supabase.from("agency_tasks").update({ status: newStatus }).eq("id", task.id);
  }

  async function handleDeleteTask(id: string) {
    if(!confirm("Excluir tarefa?")) return;
    await supabase.from("agency_tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  }

  // --- HELPERS ---
  const getPriorityColor = (p: string) => {
    if (p === 'alta') return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (p === 'media') return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  };

  const getProjectName = (id: string | null) => {
    if (!id) return null;
    return projects.find(p => p.id === id)?.title;
  };

  const getUserInfo = (id: string | null) => {
    if (!id) return null;
    return users.find(u => u.id === id);
  };

  const getUserDisplayName = (user: UserProfile) => {
    if (user.name) return user.name;
    return user.email.split('@')[0];
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.substring(0, 2).toUpperCase();
  };

  // --- FILTRAGEM ---
  const filteredTasks = tasks.filter(task => {
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    const date = task.due_date ? new Date(task.due_date) : null;
    
    // Filtro Específico de Concluídas
    if (selectedFilter === "completed") return task.status === 'done';

    // Outros Filtros (Geralmente mostram pendentes, exceto "Hoje" que mostra o progresso do dia)
    if (selectedFilter === "today") {
      // Mostra hoje (pendentes ou feitas) OU atrasadas pendentes
      return (date && isToday(date)) || (date && isPast(date) && !isToday(date) && task.status !== 'done');
    }
    if (selectedFilter === "upcoming") return date && date > new Date() && !isToday(date) && task.status !== 'done';
    if (selectedFilter === "overdue") return date && isPast(date) && !isToday(date) && task.status !== 'done';
    
    // "All" mostra pendentes por padrão para não poluir, ou tudo se preferir. 
    // Aqui deixei mostrando tudo que NÃO está feito, para forçar o uso da aba "Concluídas" para ver histórico.
    if (selectedFilter === "all") return task.status !== 'done';
    
    return true; 
  });

  const todayTasks = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const completedToday = todayTasks.filter(t => t.status === 'done').length;
  const progress = todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      
      {/* CABEÇALHO */}
      <div className="flex-none p-4 md:p-6 pb-2 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestão da Agência</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar tarefa..." 
                className="pl-9 bg-muted/50 border-none" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4" /> Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Demanda Interna</DialogTitle>
                  <DialogDescription>O que a agência precisa resolver?</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input placeholder="Ex: Pagar servidor..." value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} autoFocus />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={newTask.priority} onValueChange={(val: any) => setNewTask({...newTask, priority: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prazo</Label>
                      <Input type="datetime-local" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vincular Projeto</Label>
                      <Select value={newTask.project_id} onValueChange={(val) => setNewTask({...newTask, project_id: val})}>
                        <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Select value={newTask.assigned_to} onValueChange={(val) => setNewTask({...newTask, assigned_to: val})}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem responsável</SelectItem>
                          {users.map(u => <SelectItem key={u.id} value={u.id}>{getUserDisplayName(u)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input placeholder="Detalhes extras..." value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                  </div>
                  <Button onClick={handleAddTask} className="w-full mt-2">Adicionar à Lista</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR DE FILTROS */}
        <div className="w-[240px] hidden md:flex flex-col border-r border-border/40 bg-card/30 p-4 gap-1">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Filtros</p>
          <Button variant={selectedFilter === 'today' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-10" onClick={() => setSelectedFilter('today')}>
            <CalendarIcon className="w-4 h-4 text-emerald-500" /> Hoje
            {todayTasks.length > 0 && <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">{todayTasks.length}</Badge>}
          </Button>
          <Button variant={selectedFilter === 'upcoming' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-10" onClick={() => setSelectedFilter('upcoming')}>
            <Clock className="w-4 h-4 text-blue-500" /> Em Breve
          </Button>
          <Button variant={selectedFilter === 'overdue' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-10" onClick={() => setSelectedFilter('overdue')}>
            <AlertCircle className="w-4 h-4 text-red-500" /> Atrasadas
          </Button>
          <Button variant={selectedFilter === 'all' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-10" onClick={() => setSelectedFilter('all')}>
            <Layout className="w-4 h-4 text-muted-foreground" /> Todas
          </Button>

          {/* NOVO BOTÃO: CONCLUÍDAS */}
          <Button variant={selectedFilter === 'completed' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-10" onClick={() => setSelectedFilter('completed')}>
            <CheckCircle2 className="w-4 h-4 text-green-600" /> Concluídas
          </Button>
          
          <Separator className="my-4 opacity-50" />
          <div className="mt-auto bg-muted/40 p-3 rounded-lg border border-border/50">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-medium">Meta Diária</span>
              <span className="text-muted-foreground">{completedToday}/{todayTasks.length}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        {/* LISTA DE TAREFAS */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          <div className="p-4 pb-2 text-sm font-medium text-muted-foreground border-b border-border/40 flex justify-between">
            <span>
              {selectedFilter === 'today' && "Foco de Hoje"}
              {selectedFilter === 'upcoming' && "Planejamento Futuro"}
              {selectedFilter === 'overdue' && "Pendências Críticas"}
              {selectedFilter === 'all' && "Todas as Demandas"}
              {selectedFilter === 'completed' && "Histórico de Entregas"}
            </span>
            <span className="text-xs">{filteredTasks.length} tarefas</span>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2 max-w-3xl mx-auto">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  {selectedFilter === 'completed' ? (
                    <>
                      <Archive className="w-12 h-12 mb-4 opacity-20" />
                      <p>Nenhuma tarefa concluída ainda.</p>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-12 h-12 mb-4 opacity-20" />
                      <p>Caixa de entrada limpa!</p>
                    </>
                  )}
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const assignee = getUserInfo(task.assigned_to);
                  const displayName = assignee ? getUserDisplayName(assignee) : null;

                  return (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md
                        ${selectedTask?.id === task.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 bg-card hover:bg-muted/40'}
                        ${task.status === 'done' ? 'opacity-60 bg-muted/20' : ''}
                      `}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                          ${task.status === 'done' 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-muted-foreground/40 hover:border-primary text-transparent'}
                        `}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </span>
                          {getProjectName(task.project_id) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal text-muted-foreground border-border">
                              {getProjectName(task.project_id)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.due_date && (
                            <span className={`flex items-center gap-1 ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : ''}`}>
                              <Clock className="w-3 h-3" />
                              {isToday(new Date(task.due_date)) ? "Hoje" : format(new Date(task.due_date), "dd MMM HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {displayName ? (
                          <Avatar className="h-6 w-6 border border-border">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center">
                            <UserIcon className="w-3 h-3 text-muted-foreground/50" />
                          </div>
                        )}

                        <Badge variant="outline" className={`text-[10px] uppercase font-bold border-none ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selectedTask?.id === task.id ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* PAINEL DE DETALHES */}
        {selectedTask ? (
          <div className="w-[320px] hidden xl:flex flex-col border-l border-border/40 bg-card p-6 animate-in slide-in-from-right-10">
            <div className="flex items-center justify-between mb-6">
              <Badge variant="outline" className={`uppercase ${getPriorityColor(selectedTask.priority)}`}>
                Prioridade {selectedTask.priority}
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteTask(selectedTask.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold leading-tight mb-2">{selectedTask.title}</h3>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <CheckSquare className="w-4 h-4" />
                  <span>{selectedTask.status === 'done' ? 'Concluída' : 'Pendente'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  {getUserInfo(selectedTask.assigned_to) ? (
                    <>
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {getInitials(getUserInfo(selectedTask.assigned_to)?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Responsável</p>
                        <p className="text-sm font-medium">{getUserInfo(selectedTask.assigned_to)?.name}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">Sem responsável</p>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <CalendarIcon className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Prazo</p>
                    <p className="text-sm">
                      {selectedTask.due_date 
                        ? format(new Date(selectedTask.due_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) 
                        : "Sem prazo definido"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2 text-muted-foreground">Descrição</p>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 min-h-[120px] text-sm leading-relaxed">
                  {selectedTask.description || "Nenhuma descrição adicionada."}
                </div>
              </div>

              <Button 
                className={`w-full gap-2 ${selectedTask.status === 'done' ? 'bg-muted text-muted-foreground hover:bg-muted' : 'bg-primary'}`}
                onClick={() => toggleTaskStatus(selectedTask)}
              >
                {selectedTask.status === 'done' ? "Reabrir Tarefa" : (
                  <><CheckCircle2 className="w-4 h-4" /> Marcar como Feita</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-[320px] hidden xl:flex flex-col items-center justify-center border-l border-border/40 bg-card/10 text-muted-foreground text-center p-6">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Layout className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="font-semibold mb-1">Detalhes da Demanda</h3>
            <p className="text-sm max-w-[200px]">Selecione uma tarefa da lista para ver os detalhes, editar ou adicionar notas.</p>
          </div>
        )}

      </div>
    </div>
  );
}