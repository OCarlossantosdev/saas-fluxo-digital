"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Plus, Search, MoreHorizontal, Trash2, X,
  Bold, Italic, Underline, Code, Heading1, Heading2, Heading3, 
  List, Quote, CheckSquare, Minus, AlertCircle, Square, 
  ChevronRight, ChevronDown, Palette, Columns, ArrowLeft, Check, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
// Importação dos componentes do Dialog
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";

import { createEditor, Descendant, Editor, Transforms, Range, Element as SlateElement, BaseEditor } from 'slate';
import { Slate, Editable, withReact, useSlate, ReactEditor, useSelected, useFocused } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';

// --- TIPOS ---
type CustomText = { text: string; [key: string]: any };
type CustomElement = { type: string; children: any[]; [key: string]: any };

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// --- CORES ---
const COLORS: Record<string, string> = { default: 'inherit', gray: '#9B9A97', brown: '#BA8E6E', orange: '#D9730D', yellow: '#DFAB01', green: '#0F7B6C', blue: '#0B6E99', purple: '#9065B0', pink: '#C14C8A', red: '#E03E3E' };
const BACKGROUNDS: Record<string, string> = { default: 'transparent', gray_background: 'rgba(155, 154, 151, 0.15)', brown_background: 'rgba(140, 46, 0, 0.15)', orange_background: 'rgba(217, 115, 13, 0.15)', yellow_background: 'rgba(223, 171, 1, 0.15)', green_background: 'rgba(15, 123, 108, 0.15)', blue_background: 'rgba(11, 110, 153, 0.15)', purple_background: 'rgba(105, 64, 165, 0.15)', pink_background: 'rgba(173, 26, 114, 0.15)', red_background: 'rgba(224, 62, 62, 0.15)' };
const COLOR_NAMES: Record<string, string> = { default: 'Padrão', gray: 'Cinza', brown: 'Marrom', orange: 'Laranja', yellow: 'Amarelo', green: 'Verde', blue: 'Azul', purple: 'Roxo', pink: 'Rosa', red: 'Vermelho' };

const Element = ({ attributes, children, element }: any) => {
  const editor = useSlate();
  switch (element.type) {
    case 'block-quote': return <blockquote {...attributes} className="border-l-4 border-foreground/40 pl-4 italic text-foreground/80 my-4 text-lg">{children}</blockquote>;
    case 'bulleted-list': return <ul {...attributes} className="list-disc ml-6 my-2 space-y-1 pl-4">{children}</ul>;
    case 'heading-one': return <h1 {...attributes} className="text-4xl font-bold mt-8 mb-4 tracking-tight">{children}</h1>;
    case 'heading-two': return <h2 {...attributes} className="text-2xl font-semibold mt-6 mb-3 tracking-tight">{children}</h2>;
    case 'heading-three': return <h3 {...attributes} className="text-xl font-semibold mt-4 mb-2 tracking-tight">{children}</h3>;
    case 'list-item': return <li {...attributes} className="text-lg leading-relaxed pl-1">{children}</li>;
    case 'check-list-item':
      return (
        <div {...attributes} className="flex items-start gap-3 my-1 group">
          <span contentEditable={false} className="mt-1.5 cursor-pointer select-none text-muted-foreground hover:text-primary transition-colors mr-2"
            onMouseDown={(e) => { 
                e.preventDefault(); 
                const path = ReactEditor.findPath(editor as any, element); 
                Transforms.setNodes(editor, { checked: !element.checked } as any, { at: path }); 
            }}
          >
            {element.checked ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
          </span>
          <span className={cn("flex-1 text-lg leading-relaxed transition-all", element.checked && "line-through text-muted-foreground opacity-50")}>{children}</span>
        </div>
      );
    case 'toggle-list':
      return (
        <div {...attributes} className="flex items-start gap-2 my-1">
           <span contentEditable={false} className="mt-1.5 cursor-pointer select-none text-muted-foreground hover:bg-muted rounded p-0.5 transition-colors mr-1"
             onMouseDown={(e) => { 
                 e.preventDefault(); 
                 const path = ReactEditor.findPath(editor as any, element); 
                 Transforms.setNodes(editor, { open: !element.open } as any, { at: path }); 
             }}
           >
             {element.open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
           </span>
           <div className="flex-1">
             <div className="text-lg leading-relaxed">{children}</div>
             {element.open && <div className="pl-4 mt-1 border-l border-border/40 min-h-[20px] text-muted-foreground text-sm italic">Conteúdo...</div>}
           </div>
        </div>
      );
    case 'callout': return <div {...attributes} className="flex gap-3 bg-muted/30 p-4 rounded-lg my-4 border border-border/40"><span contentEditable={false} className="select-none text-xl">💡</span><div className="text-lg leading-relaxed font-medium w-full">{children}</div></div>;
    case 'divider': return <div {...attributes} contentEditable={false} className="py-6 select-none cursor-default"><hr className={cn("border-t-2 border-border/30 transition-colors", false)} /><div className="hidden">{children}</div></div>;
    case 'column-group': return <div {...attributes} className="grid grid-cols-2 gap-4 my-4">{children}</div>;
    case 'column': return <div {...attributes} className="border border-dashed border-border/20 p-2 rounded min-h-[50px]">{children}</div>;
    default: return <p {...attributes} className="text-lg leading-relaxed mb-2 text-foreground/90">{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.code) children = <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-red-500">{children}</code>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>;
  const style = { color: leaf.color && leaf.color !== 'default' ? COLORS[leaf.color] : undefined, backgroundColor: leaf.backgroundColor && leaf.backgroundColor !== 'default' ? BACKGROUNDS[leaf.backgroundColor] : undefined };
  return <span {...attributes} style={style}>{children}</span>;
};

const safeIsMarkActive = (editor: Editor, format: string) => {
  try { const marks = Editor.marks(editor); return marks ? (marks as any)[format] : false; } catch (e) { return false; }
};
const safeGetString = (editor: Editor, selection: any) => {
    try { return Editor.string(editor, selection); } catch(e) { return ""; }
};

const HoverMenu = () => {
  const editor = useSlate();
  const { selection } = editor;
  const menuRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isValidSelection = selection && !Range.isCollapsed(selection) && safeGetString(editor, selection) !== '';

  useEffect(() => {
    if (!isValidSelection) { setShowColorPicker(false); return; }
    const el = menuRef.current; if (!el) return;
    const domSelection = window.getSelection(); if (!domSelection || domSelection.rangeCount === 0) return;
    try {
        const domRange = domSelection.getRangeAt(0);
        const rect = domRange.getBoundingClientRect();
        if (rect.width === 0) return; 
        el.style.display = 'flex'; el.style.opacity = '1';
        el.style.top = `${rect.top + window.scrollY - el.offsetHeight - 10}px`; el.style.left = `${rect.left + window.scrollX - el.offsetWidth / 2 + rect.width / 2}px`;
    } catch(e) { el.style.display = 'none'; }
  });

  if (!isValidSelection) return null;
  const toggleMark = (format: string, value: any = true) => { if (value === 'default') Editor.removeMark(editor, format); else Editor.addMark(editor, format, value); };

  if (showColorPicker) return (
        <div ref={menuRef} className="absolute z-50 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl flex flex-col w-56 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-2 py-2 border-b border-white/10 bg-[#252525]">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-white" onClick={() => setShowColorPicker(false)}><ArrowLeft className="w-3 h-3"/></Button>
                <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">Cores</span><div className="w-6"/>
            </div>
            <div className="overflow-y-auto max-h-[250px] p-1 custom-scrollbar">
                <div className="px-2 py-1.5 text-[10px] text-muted-foreground uppercase font-bold">Texto</div>
                {Object.keys(COLORS).map(color => ( <button key={color} onClick={() => toggleMark('color', color)} className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-white/10 text-left group transition-colors"><div className="flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center text-sm font-serif border border-white/10 rounded bg-[#252525]" style={{ color: COLORS[color] === 'inherit' ? '#fff' : COLORS[color] }}>A</span><span className="text-white/80 group-hover:text-white">{COLOR_NAMES[color] || 'Padrão'}</span></div>{safeIsMarkActive(editor, 'color') === color && <Check className="w-3 h-3 text-blue-400"/>}</button> ))}
                <div className="px-2 py-1.5 text-[10px] text-muted-foreground uppercase font-bold mt-2 border-t border-white/10 pt-2">Fundo</div>
                {Object.keys(BACKGROUNDS).map(bg => ( <button key={bg} onClick={() => toggleMark('backgroundColor', bg)} className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-white/10 text-left group transition-colors"><div className="flex items-center gap-2"><div className="w-5 h-5 rounded border border-white/10" style={{ backgroundColor: BACKGROUNDS[bg] === 'transparent' ? '#252525' : BACKGROUNDS[bg] }}></div><span className="text-white/80 group-hover:text-white">{COLOR_NAMES[bg.replace('_background', '')] || 'Padrão'}</span></div>{safeIsMarkActive(editor, 'backgroundColor') === bg && <Check className="w-3 h-3 text-blue-400"/>}</button> ))}
            </div>
        </div>
    )

  return (
    <div ref={menuRef} className="absolute z-50 gap-1 bg-[#1F1F1F] border border-[#373737] p-1 rounded-md shadow-xl animate-in zoom-in-95 select-none flex items-center">
      <FormatButton icon={<Bold className="w-4 h-4"/>} onClick={() => toggleMark('bold')} isActive={safeIsMarkActive(editor, 'bold')} />
      <FormatButton icon={<Italic className="w-4 h-4"/>} onClick={() => toggleMark('italic')} isActive={safeIsMarkActive(editor, 'italic')} />
      <FormatButton icon={<Underline className="w-4 h-4"/>} onClick={() => toggleMark('underline')} isActive={safeIsMarkActive(editor, 'underline')} />
      <FormatButton icon={<Code className="w-4 h-4"/>} onClick={() => toggleMark('code')} isActive={safeIsMarkActive(editor, 'code')} />
      <div className="w-px bg-white/20 mx-1 h-5 self-center" />
      <FormatButton icon={<div className="flex items-center"><span className="text-xs font-serif">A</span><Palette className="w-3 h-3 ml-1 opacity-70"/></div>} onClick={() => setShowColorPicker(true)} isActive={false} className="w-auto px-2" />
    </div>
  );
};

const FormatButton = ({ icon, isActive, onClick, className }: any) => ( <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-white/10 text-white", isActive && "text-blue-400 bg-white/10", className)} onMouseDown={(e) => { e.preventDefault(); onClick(); }}>{icon}</Button> );

export default function AnotacoesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle" | "error">("idle");
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- ESTADO DO MODAL DE EXCLUSÃO ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const editor = useMemo(() => {
    const e = withHistory(withReact(createEditor()));
    const { isVoid, normalizeNode } = e;
    e.isVoid = (element) => { return element.type === 'divider' ? true : isVoid(element); };
    
    e.normalizeNode = (entry) => {
        const [node] = entry;
        if (Editor.isEditor(node) && node.children.length === 0) {
            Transforms.insertNodes(e, { type: 'paragraph', children: [{ text: '' }] }, { at: [0] });
            return;
        }
        normalizeNode(entry);
    }
    return e;
  }, []);
  
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ top: 0, left: 0 });
  const [targetRange, setTargetRange] = useState<Range | null>(null);

  useEffect(() => { fetchNotes(); }, []);

  async function fetchNotes() {
    const { data } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
    if (data) setNotes(data);
  }

  // --- FUNÇÃO DE EXTRAÇÃO SEGURA ---
  const getSafeContent = useCallback((content: string | null): Descendant[] => {
    const defaultContent: Descendant[] = [{ type: 'paragraph', children: [{ text: '' }] }];
    if (!content) return defaultContent;
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed) || parsed.length === 0) return defaultContent;
      return parsed; 
    } catch (e) { return defaultContent; }
  }, []);

  const initialContent = useMemo(() => {
    return getSafeContent(selectedNote?.content);
  }, [selectedNote?.id, getSafeContent]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<any>({}); 

  const updateNote = async (id: string, updates: { title?: string, content?: any }) => {
    if (updates.title !== undefined) {
      setNotes((prev: any[]) => prev.map((n: any) => n.id === id ? { ...n, title: updates.title } : n));
      setSelectedNote((prev: any) => (prev && prev.id === id ? { ...prev, title: updates.title } : prev));
    }

    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    
    saveTimeoutRef.current = setTimeout(async () => {
        const finalUpdates = pendingUpdatesRef.current;
        const payload: any = { updated_at: new Date().toISOString() };
        
        if (finalUpdates.title !== undefined) payload.title = finalUpdates.title;
        if (finalUpdates.content !== undefined) payload.content = JSON.stringify(finalUpdates.content);

        const { error } = await supabase.from("notes").update(payload).eq("id", id);
        
        if (error) { 
            console.error("Erro Supabase:", error); 
            setSaveStatus("error"); 
        } else { 
            setSaveStatus("saved"); 
            setTimeout(() => setSaveStatus("idle"), 2000); 
        }
        pendingUpdatesRef.current = {};
    }, 1000);
  };

  async function handleCreateNote() {
    const initial = [{ type: 'paragraph', children: [{ text: '' }] }];
    const { data } = await supabase.from("notes").insert([{ title: "", content: JSON.stringify(initial), is_pinned: false }]).select().single();
    if (data) { setNotes([data, ...notes]); setSelectedNote(data); }
  }

  // --- FUNÇÃO DE EXCLUSÃO ATUALIZADA ---
  async function confirmDeleteNote() {
    if (!selectedNote) return;
    await supabase.from("notes").delete().eq("id", selectedNote.id);
    setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
    setSelectedNote(null);
    setIsDeleteModalOpen(false);
  }

  // Abre o modal em vez de usar window.confirm
  function handleDeleteRequest() {
    setIsDeleteModalOpen(true);
  }

  const onChange = (value: Descendant[]) => {
    if(!selectedNote) return;
    updateNote(selectedNote.id, { content: value });

    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      const charBefore = Editor.before(editor, start, { unit: 'character' });
      const char = charBefore ? safeGetString(editor, { anchor: charBefore, focus: start }) : ""; 

      if (char === '/') {
        try {
            const domSelection = window.getSelection();
            if (domSelection && domSelection.rangeCount > 0) {
                const rect = domSelection.getRangeAt(0).getBoundingClientRect();
                setSlashMenuCoords({ top: rect.top + window.scrollY + 28, left: rect.left + window.scrollX });
                setSlashMenuOpen(true);
                if (charBefore) setTargetRange({ anchor: charBefore, focus: start });
            }
        } catch(e) {}
      } else if (slashMenuOpen && (char === ' ' || char === undefined)) {
         setSlashMenuOpen(false); 
      }
    }
  };

  const applyCommand = (format: string) => {
    if (!targetRange) return;
    try {
        Transforms.select(editor, targetRange);
        Transforms.delete(editor);
        
        if (format === 'divider') {
            Transforms.insertNodes(editor, { type: 'divider', children: [{ text: '' }] } as any);
            Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }]} as any);
        } else if (format === 'columns') {
            const col1 = { type: 'column', children: [{ type: 'paragraph', children: [{ text: 'Coluna 1' }] }] };
            const col2 = { type: 'column', children: [{ type: 'paragraph', children: [{ text: 'Coluna 2' }] }] };
            Transforms.insertNodes(editor, { type: 'column-group', children: [col1, col2] } as any);
            Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }]} as any);
        } else {
            const newProperties: Partial<any> = { type: format };
            Transforms.setNodes(editor, newProperties);
            if(format === 'check-list-item') Transforms.setNodes(editor, { checked: false } as any);
            if(format === 'toggle-list') Transforms.setNodes(editor, { open: true } as any);
        }
        setSlashMenuOpen(false);
        setTimeout(() => ReactEditor.focus(editor as any), 10);
    } catch(e) { console.error(e) }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      
      {/* SIDEBAR DE NOTAS */}
      <div className="w-[280px] border-r border-border/40 bg-card/5 flex flex-col z-20">
        <div className="p-6 pb-2 flex items-center justify-between"><span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground/60 uppercase">Notas</span><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-accent" onClick={handleCreateNote}><Plus className="w-4 h-4" /></Button></div>
        <div className="px-4 py-2"><div className="relative group"><Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground/40" /><Input placeholder="Pesquisar..." className="pl-8 h-8 bg-accent/30 border-none text-xs rounded-lg focus-visible:ring-0" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
        <div className="flex-1 px-3 mt-4 overflow-y-auto custom-scrollbar"><div className="flex flex-col gap-1">{notes.filter(n => (n?.title || "").toLowerCase().includes(searchTerm.toLowerCase())).map((note) => (<div key={note.id} onClick={() => setSelectedNote(note)} className={cn("p-2.5 rounded-lg cursor-pointer transition-all border border-transparent group", selectedNote?.id === note.id ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}><span className="text-[13px] font-medium truncate block">{note.title || "Sem título"}</span></div>))}</div></div>
      </div>

      {/* ÁREA DE EDIÇÃO */}
      <div className="flex-1 flex flex-col relative bg-background h-full overflow-hidden">
        {selectedNote ? (
          <div className="flex flex-col h-full w-full animate-in fade-in duration-500">
            <div className="h-14 flex justify-end items-center px-10 shrink-0">
                <div className={cn("text-[9px] font-bold tracking-[0.2em] uppercase opacity-40 mr-4", saveStatus === 'error' && "text-red-500 opacity-100")}>{saveStatus === "saving" ? "Salvando..." : saveStatus === "saved" ? "Salvo" : saveStatus === "error" ? "Erro ao Salvar!" : ""}</div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4"/></Button></DropdownMenuTrigger>
                    {/* Botão de Excluir que abre o Modal */}
                    <DropdownMenuContent align="end"><DropdownMenuItem onClick={handleDeleteRequest} className="text-red-500 cursor-pointer"><Trash2 className="w-4 h-4 mr-2" /> Excluir Nota</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar"><div className="max-w-[850px] mx-auto px-12 md:px-24 pt-4 pb-40">
                <input className="w-full text-5xl font-bold bg-transparent border-none outline-none mb-8 tracking-tight placeholder:text-muted-foreground/20 text-foreground" placeholder="Título" value={selectedNote.title || ""} onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })} />
                <Slate 
                    key={selectedNote.id} 
                    editor={editor} 
                    initialValue={initialContent} 
                    onChange={onChange}
                >
                  <HoverMenu />
                  {slashMenuOpen && (<div className="fixed z-50 w-72 bg-[#1e1e1e] border border-white/10 shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[450px] overflow-y-auto animate-in zoom-in-95 custom-scrollbar" style={{ top: slashMenuCoords.top, left: slashMenuCoords.left }}>
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground bg-[#252525]">Blocos Básicos</div>
                      <CommandButton onClick={() => applyCommand('heading-one')} icon={<Heading1 className="w-4 h-4"/>} label="Título 1" desc="Seção grande" />
                      <CommandButton onClick={() => applyCommand('heading-two')} icon={<Heading2 className="w-4 h-4"/>} label="Título 2" desc="Seção média" />
                      <CommandButton onClick={() => applyCommand('heading-three')} icon={<Heading3 className="w-4 h-4"/>} label="Título 3" desc="Subseção" />
                      <CommandButton onClick={() => applyCommand('bulleted-list')} icon={<List className="w-4 h-4"/>} label="Lista" desc="Marcadores simples" />
                      <CommandButton onClick={() => applyCommand('check-list-item')} icon={<CheckSquare className="w-4 h-4"/>} label="Lista de tarefas" desc="Acompanhe tarefas" />
                      <CommandButton onClick={() => applyCommand('toggle-list')} icon={<ChevronRight className="w-4 h-4"/>} label="Lista Alternante" desc="Oculte conteúdo" />
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground bg-[#252525] mt-1">Mídia & Layout</div>
                      <CommandButton onClick={() => applyCommand('callout')} icon={<AlertCircle className="w-4 h-4"/>} label="Destaque" desc="Caixa de aviso" />
                      <CommandButton onClick={() => applyCommand('block-quote')} icon={<Quote className="w-4 h-4"/>} label="Citação" desc="Citar texto" />
                      <CommandButton onClick={() => applyCommand('divider')} icon={<Minus className="w-4 h-4"/>} label="Divisor" desc="Linha horizontal" />
                      <CommandButton onClick={() => applyCommand('columns')} icon={<Columns className="w-4 h-4"/>} label="2 Colunas" desc="Organize lado a lado" />
                    </div>)}
                  <Editable className="min-h-[70vh] outline-none text-foreground/80 focus:text-foreground transition-colors pb-20 text-lg leading-relaxed" placeholder="Digite '/' para comandos..." renderElement={props => <Element {...props} />} renderLeaf={props => <Leaf {...props} />} spellCheck={false} />
                </Slate>
              </div></div>
          </div>
        ) : (<div className="flex-1 flex items-center justify-center opacity-[0.03] text-[150px] font-black italic select-none">FLUXO</div>)}
      </div>

      {/* --- MODAL DE EXCLUSÃO DE NOTA --- */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-red-500/20 bg-card">
          <DialogHeader className="items-center text-center">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl">Excluir Nota?</DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza? Esta nota será apagada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              variant="destructive" 
              className="w-full font-semibold shadow-sm" 
              onClick={confirmDeleteNote}
            >
              Excluir Nota
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

function CommandButton({ onClick, icon, label, desc }: any) {
  return (
    <button onMouseDown={(e) => { e.preventDefault(); onClick(); }} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 text-white/90 w-full text-left transition-colors group">
      <div className="flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-white/5 text-muted-foreground group-hover:text-white group-hover:border-white/20 transition-colors shrink-0">{icon}</div>
      <div className="flex flex-col overflow-hidden"><span className="font-medium leading-none truncate">{label}</span>{desc && <span className="text-[10px] text-muted-foreground mt-0.5 truncate">{desc}</span>}</div>
    </button>
  );
}