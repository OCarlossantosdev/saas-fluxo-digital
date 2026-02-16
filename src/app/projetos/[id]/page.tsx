"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  ArrowLeft,
  MessageSquare,
  Send,
  Loader2,
  Ban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Calendar as CalendarIcon,
  Tag,
  User,
  Layout,
  Paperclip,
  AlignLeft,
  X,
  Edit2,
  FileIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner"; 

// --- TIPOS ---
interface Label {
  id: string;
  name: string;
  color: string;
}
interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
}
interface UserProfile {
  id: string;
  name: string;
  email: string;
}
interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
  };
}
interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  description?: string;
  due_date?: string;
  labels?: Label[];
  assignees?: UserProfile[]; 
}

interface ProjectDetails {
  id: string;
  name: string;
  clients: { company_name: string } | null; // Pode ser nulo se for projeto interno
}

const COLUMNS = [
  { id: "todo", label: "A Fazer", color: "border-zinc-300", bg: "bg-zinc-50 dark:bg-zinc-900", icon: AlertCircle },
  { id: "doing", label: "Em Andamento", color: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", icon: Clock },
  { id: "blocked", label: "Bloqueado", color: "border-red-500", bg: "bg-red-50 dark:bg-red-950/20", icon: Ban },
  { id: "review", label: "Revisão", color: "border-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20", icon: AlertCircle },
  { id: "done", label: "Concluído", color: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", icon: CheckCircle2 },
  { id: "canceled", label: "Cancelado", color: "border-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800", icon: Ban },
];

const PRESET_COLORS = [
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Verde", value: "#22c55e" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cinza", value: "#64748b" },
  { name: "Preto", value: "#171717" },
];

export default function ProjectWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const router = useRouter();

  const [projectId, setProjectId] = useState<string>("");
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados
  const [collapsedCols, setCollapsedCols] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeColumnInput, setActiveColumnInput] = useState<string | null>(null);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modais
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [isDeleteCommentModalOpen, setIsDeleteCommentModalOpen] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);

  // Dados Detalhados
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskLabels, setTaskLabels] = useState<Label[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [taskChecklist, setTaskChecklist] = useState<ChecklistItem[]>([]);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<Attachment[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  const [taskAssignees, setTaskAssignees] = useState<UserProfile[]>([]);

  // Inputs
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[4].value);
  const [newMemberName, setNewMemberName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.id);
      fetchProjectData(p.id);
      fetchTasks(p.id);
      fetchLabels(p.id);
      fetchSystemUsers();
    });
  }, [params]);

  // --- FETCH DATA ---
 async function fetchProjectData(id: string) {
    // O select busca o ID, o Nome do projeto e entra na tabela 'clients' para pegar o nome da empresa
    const { data } = await supabase
      .from("projects")
      .select(`
        id, 
        name, 
        clients ( company_name )
      `)
      .eq("id", id)
      .single();
      
    if (data) setProject(data as any);
  }

  async function fetchTasks(id: string) {
    const { data } = await supabase
      .from("tasks")
      .select(`*, task_labels ( labels (*) ), task_assignees ( profiles (*) )`)
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    const formatted = data?.map((t: any) => ({
      ...t,
      labels: t.task_labels.map((tl: any) => tl.labels),
      assignees: t.task_assignees.map((ta: any) => ta.profiles)
    })) || [];
    setTasks(formatted);
    setLoading(false);
  }

  async function fetchLabels(id: string) {
    const { data } = await supabase.from("labels").select("*").eq("project_id", id);
    if (data && data.length > 0) setAllLabels(data);
    else {
      const defaults = [
        { name: "Prioridade", color: "#ef4444", project_id: id },
        { name: "Revisão", color: "#a855f7", project_id: id },
        { name: "Em Espera", color: "#eab308", project_id: id },
      ];
      const { data: created } = await supabase.from("labels").insert(defaults).select();
      if (created) setAllLabels(created);
    }
  }

  async function fetchSystemUsers() {
    const { data } = await supabase.from("profiles").select("id, name, email");
    if (data) setSystemUsers(data);
  }

  // --- ACTIONS ---
  const toggleColumn = (colId: string) => {
    setCollapsedCols(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
  };

  // --- DRAG AND DROP ---
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;
    const updatedTasks = tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
  }

  // --- TASK CRUD ---
  async function handleAddTask(status: string) {
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle;
    setNewTaskTitle(""); // Limpa input rápido
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        toast.error("Erro: Usuário não autenticado.");
        return;
    }

    // Tenta inserir na tabela 'tasks'
    const { data, error } = await supabase
      .from("tasks")
      .insert({ 
          project_id: projectId, 
          user_id: user.id, 
          title: title, 
          status: status 
      })
      .select()
      .single();

    if (error) {
        console.error("Erro ao criar tarefa:", error);
        toast.error(`Não foi possível criar a tarefa: ${error.message}`);
        setNewTaskTitle(title); // Devolve o texto em caso de erro
    } else {
        toast.success("Tarefa criada!");
        fetchTasks(projectId);
        // Foca no input novamente se estiver aberto
        setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function requestDeleteTask(taskId: string) {
    setTaskToDeleteId(taskId);
    setIsDeleteModalOpen(true);
  }

  async function confirmDeleteTask() {
    if (!taskToDeleteId) return;
    await supabase.from("tasks").delete().eq("id", taskToDeleteId);
    setIsDeleteModalOpen(false);
    if (selectedTask?.id === taskToDeleteId) setIsModalOpen(false);
    setTaskToDeleteId(null);
    fetchTasks(projectId);
    toast.success("Tarefa excluída.");
  }

  // --- MEMBROS ---
  async function toggleTaskMember(userId: string) {
    if (!selectedTask) return;
    const isAssigned = taskAssignees.some(u => u.id === userId);
    let newAssignees = [...taskAssignees];

    if (isAssigned) {
      newAssignees = newAssignees.filter(u => u.id !== userId);
      setTaskAssignees(newAssignees);
      await supabase.from("task_assignees").delete().eq("task_id", selectedTask.id).eq("user_id", userId);
    } else {
      const userToAdd = systemUsers.find(u => u.id === userId);
      if (userToAdd) {
        newAssignees.push(userToAdd);
        setTaskAssignees(newAssignees);
        await supabase.from("task_assignees").insert({ task_id: selectedTask.id, user_id: userId });
      }
    }
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, assignees: newAssignees } : t));
  }

  // --- COMENTÁRIOS ---
  function requestDeleteComment(commentId: string) {
    setCommentToDeleteId(commentId);
    setIsDeleteCommentModalOpen(true);
  }

  async function confirmDeleteComment() {
    if (!commentToDeleteId) return;
    await supabase.from("task_comments").delete().eq("id", commentToDeleteId);
    setTaskComments(taskComments.filter((c) => c.id !== commentToDeleteId));
    setIsDeleteCommentModalOpen(false);
    setCommentToDeleteId(null);
    toast.success("Comentário removido.");
  }

  async function addComment() {
    if (!selectedTask || !newComment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("task_comments")
        .insert({ task_id: selectedTask.id, user_id: user.id, content: newComment })
        .select("*, profiles(name)")
        .single();
      
      if (error) throw error;
      if (data) {
        setTaskComments([...taskComments, data]);
        setNewComment("");
        toast.success("Comentário enviado");
      }
    } catch (e) {
      toast.error("Erro ao enviar comentário.");
      console.error(e);
    }
  }

  async function updateComment(id: string) {
    await supabase.from("task_comments").update({ content: editingCommentText }).eq("id", id);
    setTaskComments(taskComments.map((c) => c.id === id ? { ...c, content: editingCommentText } : c));
    setEditingCommentId(null);
  }

  // --- LABELS & FUNÇÃO QUE FALTAVA ---
  async function createLabel() {
    if (!newLabelName.trim()) return;
    const { data } = await supabase.from("labels").insert({ project_id: projectId, name: newLabelName, color: selectedColor }).select().single();
    if (data) {
        setAllLabels([...allLabels, data]);
        setNewLabelName("");
        toast.success("Etiqueta criada");
    }
  }

  async function toggleLabel(label: Label) {
    if (!selectedTask) return;
    const exists = taskLabels.find((l) => l.id === label.id);
    if (exists) {
      await supabase.from("task_labels").delete().eq("task_id", selectedTask.id).eq("label_id", label.id);
      const newLabels = taskLabels.filter((l) => l.id !== label.id);
      setTaskLabels(newLabels);
      setTasks(tasks.map((t) => t.id === selectedTask.id ? { ...t, labels: newLabels } : t));
    } else {
      await supabase.from("task_labels").insert({ task_id: selectedTask.id, label_id: label.id });
      const newLabels = [...taskLabels, label];
      setTaskLabels(newLabels);
      setTasks(tasks.map((t) => t.id === selectedTask.id ? { ...t, labels: newLabels } : t));
    }
  }

  // AQUI ESTÁ A FUNÇÃO QUE FALTAVA
  async function deleteLabelFromProject(labelId: string) {
    // Removemos o confirm nativo e tentamos excluir direto (ou poderiamos usar modal)
    const { error } = await supabase.from("labels").delete().eq("id", labelId);
    
    if (error) {
        toast.error("Erro ao excluir etiqueta. Verifique se ela está em uso.");
        return;
    }

    setAllLabels(allLabels.filter((l) => l.id !== labelId));
    setTaskLabels(taskLabels.filter((l) => l.id !== labelId));
    toast.success("Etiqueta removida do projeto.");
  }

  // --- OPEN MODAL ---
  async function openTaskModal(task: Task) {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskLabels(task.labels || []);
    setTaskAssignees(task.assignees || []);
    setIsModalOpen(true);

    const [resCheck, resComm, resAtt] = await Promise.all([
      supabase.from("checklists").select("*").eq("task_id", task.id).order("created_at"),
      supabase.from("task_comments").select("*, profiles(name)").eq("task_id", task.id).order("created_at", { ascending: true }),
      supabase.from("task_attachments").select("*").eq("task_id", task.id).order("uploaded_at", { ascending: false })
    ]);

    setTaskChecklist(resCheck.data || []);
    setTaskComments(resComm.data || []);
    setTaskAttachments(resAtt.data || []);
  }

  // --- OUTROS ---
  async function updateTitle() {
    if (!selectedTask || !taskTitle.trim() || taskTitle === selectedTask.title) return;
    await supabase.from("tasks").update({ title: taskTitle }).eq("id", selectedTask.id);
    setTasks(tasks.map((t) => t.id === selectedTask.id ? { ...t, title: taskTitle } : t));
    setSelectedTask({ ...selectedTask, title: taskTitle });
  }

  async function saveDescription() {
    if (!selectedTask) return;
    await supabase.from("tasks").update({ description: taskDesc }).eq("id", selectedTask.id);
    setTasks(tasks.map((t) => t.id === selectedTask.id ? { ...t, description: taskDesc } : t));
  }

  async function handleDateSelect(date: Date | undefined) {
    if (!selectedTask || !date) return;
    const isoDate = date.toISOString();
    await supabase.from("tasks").update({ due_date: isoDate }).eq("id", selectedTask.id);
    setSelectedTask({ ...selectedTask, due_date: isoDate });
    setTasks(tasks.map((t) => t.id === selectedTask.id ? { ...t, due_date: isoDate } : t));
  }

  async function addChecklistItem() {
    if (!selectedTask || !newChecklistTitle.trim()) return;
    const { data } = await supabase.from("checklists").insert({ task_id: selectedTask.id, title: newChecklistTitle }).select().single();
    if (data) {
      setTaskChecklist([...taskChecklist, data]);
      setNewChecklistTitle("");
    }
  }

  async function toggleCheckitem(id: string, newState: boolean) {
    setTaskChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, is_completed: newState } : i)));
    await supabase.from("checklists").update({ is_completed: newState }).eq("id", id);
  }

  async function deleteCheckitem(id: string) {
    await supabase.from("checklists").delete().eq("id", id);
    setTaskChecklist(taskChecklist.filter((i) => i.id !== id));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedTask || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("project-files").upload(fileName, file);
    if (uploadError) return toast.error("Erro no upload.");
    const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(fileName);
    const { data } = await supabase.from("task_attachments").insert({ task_id: selectedTask.id, file_name: file.name, file_url: publicUrl, file_type: file.type }).select().single();
    if (data) setTaskAttachments([data, ...taskAttachments]);
  }

  async function addMember() { /* Placeholder se quiser criar membros novos (não usado, usamos systemUsers) */ }

  // --- RENDER ---
  const DraggableTaskCard = ({ task, columnColor }: { task: Task; columnColor: string }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
    const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
    if (isDragging) return <div ref={setNodeRef} style={style} className="opacity-50"><Card className={`border-2 border-dashed ${columnColor} h-[80px]`} /></div>;
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== "done";

    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none group">
        <Card onClick={() => openTaskModal(task)} className={`bg-card hover:shadow-md transition-all border-l-4 ${columnColor} cursor-pointer relative hover:border-primary/50`}>
          <CardContent className="p-3 space-y-2">
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">{task.labels.map((l) => (<div key={l.id} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: l.color }} title={l.name} />))}</div>
            )}
            <div className="flex justify-between items-start gap-2"><span className="text-sm font-medium leading-snug">{task.title}</span></div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {task.due_date && (
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-auto gap-1 font-normal ${isOverdue ? "bg-red-500 text-white border-red-600" : "text-muted-foreground"}`}>
                  <Clock className="w-3 h-3" /> {isOverdue ? `${format(new Date(task.due_date), "dd/MM")} - ATRASADO` : format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                </Badge>
              )}
              {/* Avatares dos membros no card */}
              {task.assignees && task.assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {task.assignees.map(u => (
                    <Avatar key={u.id} className="w-5 h-5 border border-background">
                      <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{u.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const DroppableColumn = ({ col }: { col: (typeof COLUMNS)[number] }) => {
    const { setNodeRef, isOver } = useDroppable({ id: col.id });
    const columnTasks = tasks.filter((t) => t.status === col.id);
    const isCollapsed = collapsedCols.includes(col.id);

    if (isCollapsed) {
      return (
        <div ref={setNodeRef} className={`flex flex-col flex-shrink-0 w-[60px] rounded-xl border border-border/50 items-center py-4 transition-all duration-300 ${col.bg} min-h-[400px] h-fit max-h-[calc(100vh-160px)] ${isOver ? 'ring-2 ring-primary bg-primary/10 scale-[1.02]' : ''}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mb-4 hover:bg-muted" onClick={() => toggleColumn(col.id)}><ChevronRight className="h-4 w-4 text-muted-foreground" /></Button>
          <div className="flex items-center gap-2 -rotate-90 mt-20 whitespace-nowrap"><col.icon className="w-4 h-4 text-muted-foreground" /><span className="font-semibold text-sm tracking-wider text-muted-foreground uppercase">{col.label}</span></div>
          <Badge variant="secondary" className="mt-24 text-[10px] shadow-sm">{columnTasks.length}</Badge>
        </div>
      );
    }

    return (
      <div ref={setNodeRef} className={`flex-1 min-w-[280px] max-w-[400px] flex flex-col transition-all duration-300 ${isOver ? 'scale-[1.02]' : ''}`}>
        <div className={`rounded-xl p-3 flex flex-col gap-3 border border-border/50 ${col.bg} h-fit max-h-[calc(100vh-160px)] ${isOver ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
          <div className={`flex items-center justify-between pb-2 border-b-2 ${col.color}`}>
            <div className="flex items-center gap-2"><col.icon className="w-4 h-4 text-muted-foreground" /><h3 className="font-semibold text-sm">{col.label}</h3><Badge variant="secondary" className="bg-background text-xs shadow-sm">{columnTasks.length}</Badge></div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted" onClick={() => toggleColumn(col.id)}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
          <div className="overflow-y-auto min-h-[50px] space-y-3 pr-1 scrollbar-thin scrollbar-thumb-rounded">
            {columnTasks.map((task) => <DraggableTaskCard key={task.id} task={task} columnColor={col.color} />)}
            {columnTasks.length === 0 && <div className="h-20 border-2 border-dashed border-muted-foreground/10 rounded-lg flex items-center justify-center text-xs text-muted-foreground/50 select-none">Arraste aqui</div>}
          </div>
          <div className="pt-2 border-t border-border/10">
            {activeColumnInput === col.id ? (
              <div className="flex flex-col gap-2 bg-background p-2 rounded-md shadow-sm">
                <Input ref={inputRef} placeholder="Nova tarefa..." className="h-8 text-sm" value={newTaskTitle} autoFocus onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTask(col.id)} onBlur={() => !newTaskTitle && setActiveColumnInput(null)} />
                <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveColumnInput(null)}>Cancelar</Button><Button size="sm" className="h-7 text-xs" onClick={() => handleAddTask(col.id)}>Salvar</Button></div>
              </div>
            ) : (
              <Button variant="ghost" className="w-full justify-start text-muted-foreground text-sm h-9 hover:bg-background/50" onClick={() => { setActiveColumnInput(col.id); setTimeout(() => inputRef.current?.focus(), 50); }}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full gap-6 pt-8 pr-2 pl-2">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-border pb-4 px-1">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
            <div><h1 className="text-2xl font-bold leading-none">{project?.name}</h1><p className="text-muted-foreground text-sm mt-1">Cliente: {project?.clients?.company_name}</p></div>
          </div>
        </div>
        {/* KANBAN */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 no-scrollbar">
          <div className="flex h-full w-full gap-4 px-1 items-start">{COLUMNS.map((col) => <DroppableColumn key={col.id} col={col} />)}</div>
        </div>
      </div>
      <DragOverlay>{activeId ? <Card className="bg-card shadow-xl border-l-4 border-primary w-[300px] cursor-grabbing opacity-90 rotate-2"><CardContent className="p-3"><span className="text-sm font-medium">Movendo...</span></CardContent></Card> : null}</DragOverlay>

      {/* MODAIS (Delete Task, Delete Comment, Task Details) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-red-500/20 bg-card">
          <DialogHeader className="items-center text-center"><div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2"><AlertTriangle className="h-6 w-6 text-red-500" /></div><DialogTitle className="text-xl">Excluir Tarefa?</DialogTitle><DialogDescription className="text-sm">Esta ação removerá a tarefa permanentemente.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-2 pt-4"><Button variant="destructive" className="w-full font-semibold shadow-sm" onClick={confirmDeleteTask}>Confirmar Exclusão</Button><Button variant="ghost" className="w-full" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteCommentModalOpen} onOpenChange={setIsDeleteCommentModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-red-500/20 bg-card">
          <DialogHeader className="items-center text-center"><div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2"><AlertTriangle className="h-6 w-6 text-red-500" /></div><DialogTitle className="text-xl">Excluir Comentário?</DialogTitle><DialogDescription className="text-sm">Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-2 pt-4"><Button variant="destructive" className="w-full font-semibold shadow-sm" onClick={confirmDeleteComment}>Excluir</Button><Button variant="ghost" className="w-full" onClick={() => setIsDeleteCommentModalOpen(false)}>Cancelar</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[80vw] w-full h-[85vh] flex flex-col p-0 gap-0 sm:max-w-[1000px] overflow-hidden">
          <DialogHeader className="sr-only"><DialogTitle>Detalhes da Tarefa</DialogTitle></DialogHeader>
          {selectedTask && (
            <div className="flex flex-1 h-full">
              {/* ESQUERDA - DETALHES */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Layout className="w-4 h-4" /><span>na lista <span className="font-semibold underline decoration-dotted text-foreground">{COLUMNS.find((c) => c.id === selectedTask.status)?.label}</span></span></div>
                  <div className="group relative"><Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onBlur={updateTitle} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="text-3xl font-bold leading-tight border-transparent hover:border-border shadow-none p-1 -ml-1 h-auto focus-visible:ring-0 bg-transparent transition-all" /><Edit2 className="w-4 h-4 text-muted-foreground absolute right-full top-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" /></div>
                  
                  {/* BARRA DE AÇÕES (Membros, Etiquetas, etc) */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Popover>
                      <PopoverTrigger asChild><Button variant="secondary" size="sm" className="h-8 gap-2 bg-muted/50 hover:bg-muted"><User className="w-4 h-4 text-muted-foreground" /> Membros</Button></PopoverTrigger>
                      <PopoverContent align="start" className="w-64 p-2">
                        <h4 className="font-medium text-xs text-muted-foreground px-2 py-1 mb-1">Selecionar Membros</h4>
                        <ScrollArea className="h-48">
                          {systemUsers.map((user) => {
                            const isSelected = taskAssignees.some(u => u.id === user.id);
                            return (
                              <div key={user.id} onClick={() => toggleTaskMember(user.id)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors">
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div>
                                <Avatar className="w-6 h-6"><AvatarFallback className="text-[10px] bg-primary/20 text-primary">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                <div className="flex flex-col overflow-hidden"><span className="text-sm font-medium truncate leading-none">{user.name}</span><span className="text-[10px] text-muted-foreground truncate">{user.email}</span></div>
                              </div>
                            );
                          })}
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    {/* Avatares dos membros selecionados */}
                    {taskAssignees.length > 0 && (<div className="flex -space-x-2 items-center mr-2">{taskAssignees.map(u => (<Avatar key={u.id} className="w-8 h-8 border-2 border-background" title={u.name}><AvatarFallback className="text-xs bg-blue-600 text-white">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>))}</div>)}
                    {/* (Etiquetas, Datas, etc - Mantidos) */}
                    <Popover><PopoverTrigger asChild><Button variant="secondary" size="sm" className="h-8 gap-2 bg-muted/50 hover:bg-muted"><Tag className="w-4 h-4 text-muted-foreground" /> Etiquetas</Button></PopoverTrigger><PopoverContent className="w-64 p-3" align="start"><div className="space-y-2"><h4 className="font-medium text-sm">Etiquetas</h4><div className="flex flex-col gap-1 max-h-40 overflow-y-auto">{allLabels.map((l) => {const isSelected = taskLabels.some((tl) => tl.id === l.id);return (<div key={l.id} className="flex items-center gap-1 group"><button onClick={() => toggleLabel(l)} className="flex-1 h-7 rounded px-2 text-left text-white text-xs font-medium flex justify-between items-center" style={{ backgroundColor: l.color }}>{l.name}{isSelected && (<Check className="w-3 h-3" />)}</button><button onClick={() => deleteLabelFromProject(l.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button></div>);})}</div><Separator /><div className="space-y-2"><Input placeholder="Nova etiqueta..." value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} className="h-7 text-xs" /><div className="flex flex-wrap gap-1.5">{PRESET_COLORS.map((c) => (<button key={c.name} onClick={() => setSelectedColor(c.value)} className={`w-5 h-5 rounded-full border transition-all ${selectedColor === c.value ? "ring-2 ring-offset-1 ring-primary scale-110" : ""}`} style={{ backgroundColor: c.value }} title={c.name} />))}</div><Button size="sm" className="w-full h-7 text-xs" onClick={createLabel} disabled={!newLabelName}>Criar</Button></div></div></PopoverContent></Popover>
                    <Button variant="secondary" size="sm" className="h-8 gap-2 bg-muted/50 hover:bg-muted" onClick={() => checklistInputRef.current?.focus()}><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Checklist</Button>
                    <Popover><PopoverTrigger asChild><Button variant="secondary" size="sm" className="h-8 gap-2 bg-muted/50 hover:bg-muted"><CalendarIcon className="w-4 h-4 text-muted-foreground" /> Datas</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedTask.due_date ? new Date(selectedTask.due_date) : undefined} onSelect={handleDateSelect} /></PopoverContent></Popover>
                    <Button variant="secondary" size="sm" className="h-8 gap-2 bg-muted/50 hover:bg-muted" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-4 h-4 text-muted-foreground" /> Anexo</Button><input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <div className="flex-1"></div>
                    <Button variant="destructive" size="sm" className="h-8 gap-2 opacity-80 hover:opacity-100" onClick={() => requestDeleteTask(selectedTask.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>

                {/* INFO EXTRA (Etiquetas, Descrição, Checklist) */}
                {(taskLabels.length > 0 || selectedTask.due_date) && (<div className="flex flex-wrap gap-6 pt-2">{taskLabels.length > 0 && (<div className="space-y-1.5"><span className="text-xs font-semibold text-muted-foreground uppercase">Etiquetas</span><div className="flex flex-wrap gap-2">{taskLabels.map((l) => (<Badge key={l.id} style={{ backgroundColor: l.color }} className="text-white hover:opacity-90 border-0 h-6 px-3">{l.name}</Badge>))}</div></div>)}{selectedTask.due_date && (<div className="space-y-1.5"><span className="text-xs font-semibold text-muted-foreground uppercase">Data de Entrega</span><div className="flex items-center gap-2"><Checkbox checked={selectedTask.status === "done"} /><Badge variant="outline" className={`h-6 px-2 text-sm font-normal gap-2 ${isPast(new Date(selectedTask.due_date)) && selectedTask.status !== "done" ? "bg-red-50 text-red-600 border-red-200" : ""}`}>{format(new Date(selectedTask.due_date), "dd 'de' MMM", { locale: ptBR })}{isPast(new Date(selectedTask.due_date)) && selectedTask.status !== "done" && (<span className="bg-red-600 text-white text-[10px] px-1 rounded">ATRASADO</span>)}</Badge></div></div>)}</div>)}
                <div className="space-y-3"><div className="flex items-center gap-2 text-lg font-semibold"><AlignLeft className="w-5 h-5 text-muted-foreground" /> <h3>Descrição</h3></div><div className="pl-7"><Textarea placeholder="Adicione uma descrição mais detalhada..." className="min-h-[120px] bg-muted/20 focus:bg-background transition-colors text-base" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} onBlur={saveDescription} /></div></div>
                <div className="space-y-3"><div className="flex items-center justify-between text-lg font-semibold"><div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-muted-foreground" /> <h3>Checklist</h3></div></div><div className="pl-7 space-y-3">{taskChecklist.length > 0 && (<div className="flex items-center gap-3 text-xs text-muted-foreground mb-2"><span className="w-8 text-right font-medium">{Math.round((taskChecklist.filter((i) => i.is_completed).length / taskChecklist.length) * 100)}%</span><Progress value={(taskChecklist.filter((i) => i.is_completed).length / taskChecklist.length) * 100} className="h-2" /></div>)}<div className="space-y-2">{taskChecklist.map((item) => (<div key={item.id} className="flex items-center gap-3 group hover:bg-muted/30 p-1 rounded -ml-1"><Checkbox className="w-5 h-5" checked={item.is_completed} onCheckedChange={(checked) => toggleCheckitem(item.id, checked === true)} /><span className={`text-sm flex-1 ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</span><button onClick={() => deleteCheckitem(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button></div>))}</div><div className="flex gap-2 mt-2"><Input ref={checklistInputRef} placeholder="Adicionar um item..." className="h-9 text-sm" value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} /><Button size="sm" onClick={addChecklistItem}>Adicionar</Button></div></div></div>
                {taskAttachments.length > 0 && (<div className="space-y-3"><div className="flex items-center gap-2 text-lg font-semibold"><Paperclip className="w-5 h-5 text-muted-foreground" /> <h3>Anexos</h3></div><div className="pl-7 space-y-2">{taskAttachments.map((file) => (<div key={file.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/20"><FileIcon className="w-8 h-8 text-blue-500" /><div className="flex-1 overflow-hidden"><p className="text-sm font-medium truncate">{file.file_name}</p><a href={file.file_url} target="_blank" className="text-xs text-muted-foreground underline">Abrir arquivo</a></div></div>))}</div></div>)}
              </div>

              {/* DIREITA - CHAT */}
              <div className="w-[380px] border-l border-border bg-muted/5 flex flex-col h-full">
                <div className="p-4 border-b border-border bg-muted/10">
                  <div className="flex items-center justify-between mb-2"><h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comentários</h3></div>
                  <div className="relative">
                    <Textarea placeholder="Escreva um comentário..." className="min-h-[80px] pr-10 resize-none bg-background" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }} />
                    <Button size="icon" className="absolute bottom-2 right-2 h-7 w-7" onClick={addComment} disabled={!newComment.trim()}><Send className="w-3 h-3" /></Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-6">
                    {taskComments.length === 0 && (<div className="text-center py-10 text-muted-foreground text-sm">Nenhum comentário.</div>)}
                    {taskComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 text-sm group">
                        <Avatar className="w-8 h-8 mt-1"><AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">{comment.profiles?.name ? comment.profiles.name.substring(0, 2).toUpperCase() : 'US'}</AvatarFallback></Avatar>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-baseline justify-between"><span className="font-bold">{comment.profiles?.name || 'Usuário da Agência'}</span><span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2"><Textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} className="min-h-[60px]" /><div className="flex gap-2 justify-end"><Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>Cancelar</Button><Button size="sm" onClick={() => updateComment(comment.id)}>Salvar</Button></div></div>
                          ) : (
                            <div className="bg-background border border-border/60 p-3 rounded-lg shadow-sm text-foreground/90 whitespace-pre-wrap relative group-hover:bg-muted/60 transition-colors">
                              {comment.content}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex bg-background/80 rounded border shadow-sm">
                                <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }} className="p-1 hover:text-blue-500"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => requestDeleteComment(comment.id)} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}