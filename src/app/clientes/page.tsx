"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Search, Trash2, User, Mail, Loader2, DollarSign, Building2, Phone, MoreHorizontal, Edit, MapPin, Map 
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  contract_value: number;
  status: string;
  state?: string;
  city?: string;
}

interface IBGEUF {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGECity {
  id: number;
  nome: string;
}

export default function ClientesPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const [ufList, setUfList] = useState<IBGEUF[]>([]);
  const [cityList, setCityList] = useState<IBGECity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    contract_value: "", 
    state: "", 
    city: "",  
  });

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data) => setUfList(data))
      .catch((err) => console.error("Erro ao buscar estados:", err));
      
    fetchClients();
  }, []);

  const fetchCities = async (ufSigla: string) => {
    if (!ufSigla) {
      setCityList([]);
      return;
    }
    setLoadingCities(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufSigla}/municipios`);
      const data = await res.json();
      setCityList(data);
    } catch (error) {
      console.error("Erro ao buscar cidades:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleStateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, state: value, city: "" }));
    fetchCities(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value === "") {
      setFormData({ ...formData, contract_value: "" });
      return;
    }
    const numericValue = (parseInt(value, 10) / 100).toFixed(2); 
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(numericValue));
    
    setFormData({ ...formData, contract_value: formattedValue });
  };

  // --- NOVA FUNÇÃO: MÁSCARA DE TELEFONE (XX) XXXXX-XXXX ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove tudo que não é dígito
    
    // Limita a 11 dígitos
    if (value.length > 11) value = value.slice(0, 11);

    // Aplica a formatação
    if (value.length > 10) {
      // Formato (99) 99999-9999
      value = value.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
      // Formato parcial (99) 9999-9999 (para fixos) ou digitando celular
      value = value.replace(/^(\d\d)(\d{4,5})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      // Formato parcial (99) 99...
      value = value.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
    } else if (value.length > 0) {
      // Formato parcial (9...
      value = value.replace(/^(\d*)/, "($1");
    }
    
    setFormData({ ...formData, phone: value });
  };

  async function fetchClients() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setClients(data);
    }
    setIsLoading(false);
  }

  function openEditModal(client: Client) {
    setEditingClientId(client.id);
    
    const formattedValue = client.contract_value 
      ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(client.contract_value)
      : "";

    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      company_name: client.company_name,
      contract_value: formattedValue,
      state: client.state || "",
      city: client.city || "",
    });

    if (client.state) {
      fetchCities(client.state);
    } else {
      setCityList([]);
    }

    setIsDialogOpen(true);
  }

  function handleOpenChange(open: boolean) {
    setIsDialogOpen(open);
    if (!open) {
      setEditingClientId(null);
      setFormData({ name: "", email: "", phone: "", company_name: "", contract_value: "", state: "", city: "" });
      setCityList([]);
    }
  }

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault(); 
    if (!formData.name || !formData.company_name) {
      alert("Preencha o nome e a empresa!");
      return;
    }

    setIsSaving(true);
    
    const cleanValueString = formData.contract_value.replace(/\./g, "").replace(",", ".");
    const numericValue = parseFloat(cleanValueString) || 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Usuário não autenticado.");
        setIsSaving(false);
        return;
    }

    if (editingClientId) {
      const { error } = await supabase
        .from("clients")
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company_name: formData.company_name,
          contract_value: numericValue,
          state: formData.state,
          city: formData.city,
        })
        .eq("id", editingClientId);

      if (!error) {
        fetchClients(); 
        handleOpenChange(false);
      } else {
        console.error(error);
        alert(`Erro ao atualizar: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from("clients").insert([
        {
          user_id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company_name: formData.company_name,
          contract_value: numericValue,
          status: "active",
          state: formData.state,
          city: formData.city,
        },
      ]);

      if (!error) {
        fetchClients();
        handleOpenChange(false);
      } else {
        console.error(error);
        alert(`Erro ao criar: ${error.message}`);
      }
    }
    
    setIsSaving(false);
  }

  async function handleDeleteClient(id: string) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (!error) {
      setClients(clients.filter((client) => client.id !== id));
    }
  }

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 h-full flex flex-col overflow-hidden">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h2>
          <p className="text-muted-foreground">Gerencie sua base de clientes e valores de contrato.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2 font-semibold shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingClientId ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
              <DialogDescription>
                {editingClientId ? "Altere os dados da empresa abaixo." : "Insira os dados da empresa e o valor do contrato mensal."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveClient} className="space-y-4 mt-2">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground"/> Empresa</Label>
                  <Input required id="company" placeholder="Ex: Tech Solutions" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground"/> Nome do Contato</Label>
                  <Input required id="name" placeholder="Ex: João Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground"/> E-mail</Label>
                  <Input id="email" type="email" placeholder="contato@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground"/> Telefone</Label>
                  {/* INPUT ATUALIZADO COM MÁSCARA */}
                  <Input 
                    id="phone" 
                    placeholder="(99) 99999-9999" 
                    value={formData.phone} 
                    onChange={handlePhoneChange} 
                    maxLength={15} // Limita o tamanho para não estourar a máscara
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state" className="flex items-center gap-2"><Map className="w-4 h-4 text-muted-foreground"/> Estado</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={handleStateChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    {/* ATUALIZADO: side="bottom" força a abertura para baixo */}
                    <SelectContent position="popper" side="bottom" className="max-h-[200px]">
                      {ufList.map((uf) => (
                        <SelectItem key={uf.id} value={uf.sigla}>{uf.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground"/> 
                    Cidade {loadingCities && <Loader2 className="w-3 h-3 animate-spin ml-1"/>}
                  </Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(val) => setFormData({...formData, city: val})}
                    disabled={!formData.state || loadingCities}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.state ? "Selecione a cidade" : "Selecione o estado primeiro"} />
                    </SelectTrigger>
                    {/* ATUALIZADO: side="bottom" força a abertura para baixo */}
                    <SelectContent position="popper" side="bottom" className="max-h-[200px]">
                      {cityList.map((city) => (
                        <SelectItem key={city.id} value={city.nome}>{city.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="value" className="text-emerald-500 font-medium flex items-center gap-2"><DollarSign className="w-4 h-4"/> Valor do Contrato (Mensal)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                  <Input 
                    required 
                    id="value" 
                    type="text" 
                    placeholder="0,00" 
                    className="pl-10 font-medium" 
                    value={formData.contract_value} 
                    onChange={handleCurrencyChange} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">Este valor será usado para calcular seu faturamento projetado no Dashboard.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingClientId ? "Atualizar Cliente" : "Salvar Cliente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="pb-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Todos os Clientes</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-9 bg-background/50" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0 flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 relative">
          <div className="rounded-md border border-border/50">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[350px]">Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Contrato Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhum cliente encontrado. Adicione seu primeiro cliente!
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/clientes/${client.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm shrink-0">
                            {client.company_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-[15px] font-semibold group-hover:text-primary transition-colors">{client.company_name}</span>
                            {(client.city || client.state) && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> 
                                {client.city}{client.city && client.state ? ' - ' : ''}{client.state}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{client.name}</span>
                          <span className="text-[11px] text-muted-foreground">{client.email || client.phone || "Sem contato"}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-semibold text-emerald-500">
                          {formatCurrency(client.contract_value || 0)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500 uppercase tracking-wider border border-emerald-500/20">
                          Ativo
                        </span>
                      </TableCell>
                      
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => openEditModal(client)}>
                              <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10" 
                              onClick={() => handleDeleteClient(client.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}