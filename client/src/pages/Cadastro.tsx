import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, History, ShieldCheck, Camera, IdCard, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import FileUpload from "@/components/FileUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Cadastro() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("clientes");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Cadastro</h1>
        <p className="text-sm text-muted-foreground">Clientes e Equipe</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="clientes" className="gap-1.5"><Building2 className="h-4 w-4" /> Clientes</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="equipe" className="gap-1.5"><Users className="h-4 w-4" /> Equipe</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="clientes" className="space-y-4">
          <ClientesTab isAdmin={isAdmin} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="equipe" className="space-y-4">
            <EquipeTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── Aba Clientes ───────────────────────────────────────────
function ClientesTab({ isAdmin }: { isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [historyClient, setHistoryClient] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.clients.list.useQuery({ search: debouncedSearch || undefined });
  const { data: history } = trpc.clients.history.useQuery({ id: historyClient?.id ?? 0 }, { enabled: !!historyClient });

  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente cadastrado!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente atualizado!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteClient = trpc.clients.delete.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente removido"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const [form, setForm] = useState({
    companyName: "", cnpj: "", zipCode: "", address: "", city: "", state: "",
    responsibleName: "", responsibleEmail: "", phone: "", notes: "",
  });

  function resetForm() {
    setForm({ companyName: "", cnpj: "", zipCode: "", address: "", city: "", state: "", responsibleName: "", responsibleEmail: "", phone: "", notes: "" });
    setEditingClient(null);
  }

  function openNew() { resetForm(); setDialogOpen(true); }

  function openEdit(c: any) {
    setEditingClient(c);
    setForm({
      companyName: c.companyName || "", cnpj: c.cnpj || "", zipCode: c.zipCode || "", address: c.address || "",
      city: c.city || "", state: c.state || "", responsibleName: c.responsibleName || "",
      responsibleEmail: c.responsibleEmail || "", phone: c.phone || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.companyName?.trim()) { toast.error("Nome da empresa é obrigatório"); return; }
    if (!form.responsibleName?.trim()) { toast.error("Nome do responsável é obrigatório"); return; }
    if (!form.responsibleEmail?.trim() || !form.responsibleEmail.includes("@")) { toast.error("E-mail do responsável inválido"); return; }
    if (editingClient) updateClient.mutate({ id: editingClient.id, ...form });
    else createClient.mutate(form);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por empresa, responsável ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar clientes" className="pl-9 rounded-lg" />
        </div>
        {isAdmin && <Button onClick={openNew} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Novo Cliente</Button>}
      </div>

      {isLoading ? (
        <LoadingSkeleton type="card" count={3} />
      ) : !clients || clients.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent>
          <EmptyState icon={Building2} title="Nenhum cliente cadastrado" description="Cadastre seus clientes para começar a agendar visitas técnicas." action={isAdmin ? <Button onClick={openNew} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Cadastrar primeiro cliente</Button> : undefined} />
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <Card key={c.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center"><Building2 className="h-5 w-5 text-indigo-600" /></div>
                  <div><CardTitle className="text-sm font-semibold">{c.companyName}</CardTitle>{c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Responsável:</span> {c.responsibleName}</p>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.responsibleEmail}</div>
                  {c.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                  {c.city && <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{c.city}{c.state ? ` - ${c.state}` : ""}</div>}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => { setHistoryClient(c); setHistoryOpen(true); }} className="gap-1 text-xs"><History className="h-3 w-3" /> Histórico</Button>
                  {isAdmin && <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>}
                  {isAdmin && <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover cliente?" description={`Tem certeza que deseja remover ${c.companyName}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteClient.mutate({ id: c.id })} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Cadastro Cliente */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><Label>Empresa *</Label><Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Nome da empresa" /></div>
            <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
            <div><Label>CEP</Label><Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="00000-000" maxLength={10} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 0000-0000" /></div>
            <div className="col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Endereço completo" /></div>
            <div><Label>Cidade</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>Estado</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} maxLength={3} placeholder="UF" /></div>
            <div><Label>Responsável *</Label><Input value={form.responsibleName} onChange={e => setForm(f => ({ ...f, responsibleName: e.target.value }))} placeholder="Nome do responsável" /></div>
            <div><Label>Email do Responsável *</Label><Input type="email" value={form.responsibleEmail} onChange={e => setForm(f => ({ ...f, responsibleEmail: e.target.value }))} placeholder="email@empresa.com" /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createClient.isPending || updateClient.isPending}>{editingClient ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de Visitas — {historyClient?.companyName}</DialogTitle></DialogHeader>
          <div className="py-2">
            {!history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><History className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhuma visita registrada</p></div>
            ) : (
              <div className="space-y-2">
                {history.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div><p className="text-sm font-medium">{v.address}, {v.city}</p><p className="text-xs text-muted-foreground">{v.description || "Sem descrição"}</p></div>
                    <div className="text-right"><p className="text-sm font-medium">{format(new Date(v.visitDate), "dd/MM/yyyy", { locale: ptBR })}</p><p className="text-xs text-muted-foreground capitalize">{v.status}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Aba Equipe ─────────────────────────────────────────────
function EquipeTab() {
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();

  const createEmp = trpc.employees.create.useMutation({
    onSuccess: (e) => { utils.employees.list.invalidate(); toast.success("Funcionário cadastrado!"); setEmpDialogOpen(false); resetEmpForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateEmp = trpc.employees.update.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Funcionário atualizado!"); setEmpDialogOpen(false); resetEmpForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteEmp = trpc.employees.delete.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Funcionário removido"); },
  });
  const upsertDriver = trpc.employees.upsertDriver.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); },
    onError: (e) => toast.error("Erro ao salvar dados de condutor: " + e.message),
  });

  const [empForm, setEmpForm] = useState({
    name: "", email: "", phone: "", zipCode: "", position: "", department: "",
    hireDate: "", status: "ativo", role: "tecnico", password: "", photoUrl: "",
    // Campos migrados de condutores
    cpf: "", cnhNumber: "", cnhCategory: "", cnhExpiry: "", bloodType: "", address: "",
  });

  function resetEmpForm() {
    setEmpForm({ name: "", email: "", phone: "", zipCode: "", position: "", department: "", hireDate: "", status: "ativo", role: "tecnico", password: "", photoUrl: "", cpf: "", cnhNumber: "", cnhCategory: "", cnhExpiry: "", bloodType: "", address: "" });
    setEditingEmp(null);
  }

  function openEditEmp(e: any) {
    setEditingEmp(e);
    const d = e.driver;
    setEmpForm({
      name: e.name || "", email: e.email || "", phone: e.phone || "",
      zipCode: e.zipCode || d?.zipCode || "",
      position: e.position || "", department: e.department || "",
      hireDate: e.hireDate ? format(new Date(e.hireDate), "yyyy-MM-dd") : "",
      status: e.status || "ativo", role: e.role || "tecnico", password: "",
      photoUrl: e.photoUrl || "",
      cpf: d?.cpf || "", cnhNumber: d?.cnhNumber || "", cnhCategory: d?.cnhCategory || "",
      cnhExpiry: d?.cnhExpiry ? format(new Date(d.cnhExpiry), "yyyy-MM-dd") : "",
      bloodType: d?.bloodType || "", address: d?.address || "",
    });
    setEmpDialogOpen(true);
  }

  function handleEmpSubmit() {
    if (!empForm.name) { toast.error("Nome é obrigatório"); return; }
    if (!empForm.email) { toast.error("E-mail é obrigatório para login"); return; }
    if (!editingEmp && !empForm.password) { toast.error("Senha é obrigatória para novo funcionário"); return; }

    const data: any = {
      name: empForm.name, email: empForm.email || undefined, phone: empForm.phone || undefined,
      zipCode: empForm.zipCode || undefined,
      role: empForm.role, position: empForm.position || undefined, department: empForm.department || undefined,
      hireDate: empForm.hireDate ? new Date(empForm.hireDate + "T00:00:00").getTime() : undefined,
      status: empForm.status,
    };
    if (empForm.password) data.password = empForm.password;
    if (empForm.photoUrl) data.photoUrl = empForm.photoUrl;

    // Dados de condutor (exceto anexos que ficam em Documentos)
    const driverData: any = {
      fullName: empForm.name,
      cpf: empForm.cpf || undefined,
      cnhNumber: empForm.cnhNumber || undefined,
      cnhCategory: empForm.cnhCategory || undefined,
      cnhExpiry: empForm.cnhExpiry ? new Date(empForm.cnhExpiry + "T00:00:00").getTime() : undefined,
      bloodType: empForm.bloodType || undefined,
      zipCode: empForm.zipCode || undefined,
      address: empForm.address || undefined,
      email: empForm.email || undefined,
    };

    if (editingEmp) {
      updateEmp.mutate({ id: editingEmp.id, ...data });
      // Salvar dados de condutor vinculado
      upsertDriver.mutate({ employeeId: editingEmp.id, ...driverData });
    } else {
      createEmp.mutate(data, {
        onSuccess: (created) => {
          // Após criar o funcionário, salvar dados de condutor
          upsertDriver.mutate({ employeeId: created.id, ...driverData });
        },
      });
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => { resetEmpForm(); setEmpDialogOpen(true); }} className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" /> Novo Funcionário
        </Button>
      </div>

      {empLoading ? (
        <LoadingSkeleton count={3} type="card" />
      ) : !employees || employees.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum funcionário cadastrado" description="Adicione técnicos e especialistas para gerenciar a equipe." action={<Button onClick={() => { resetEmpForm(); setEmpDialogOpen(true); }} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Novo Funcionário</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e: any) => (
            <Card key={e.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 rounded-lg">
                    <AvatarImage src={e.photoUrl ?? undefined} alt={e.name} />
                    <AvatarFallback className="bg-indigo-100"><Users className="h-5 w-5 text-indigo-600" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm font-semibold">{e.name}</CardTitle>
                    {e.position && <p className="text-xs text-muted-foreground">{e.position}</p>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${e.role === "administrador" ? "bg-blue-100 text-blue-700" : e.role === "especialista" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>{e.role}</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${e.status === "ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{e.status === "ativo" ? "Ativo" : "Inativo"}</span>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {e.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{e.email}</div>}
                {e.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{e.phone}</div>}
                {e.driver?.cpf && <div className="flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" />CPF: {e.driver.cpf}</div>}
                {e.driver?.cnhNumber && <div className="flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" />CNH: {e.driver.cnhCategory || ""} {e.driver.cnhNumber}</div>}
                {e.driver?.bloodType && <div className="flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" />Tipo Sanguíneo: {e.driver.bloodType}</div>}
                {e.driver?.cnhExpiry && <p className={new Date(e.driver.cnhExpiry) < new Date() ? "text-red-600 font-medium" : ""}>Validade CNH: {format(new Date(e.driver.cnhExpiry), "dd/MM/yyyy", { locale: ptBR })}</p>}
                {e.department && <p>Depto: {e.department}</p>}
                {e.hireDate && <p>Admissão: {format(new Date(e.hireDate), "dd/MM/yyyy", { locale: ptBR })}</p>}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => openEditEmp(e)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                  <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover Funcionário" description={`Tem certeza que deseja remover ${e.name}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteEmp.mutate({ id: e.id })} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Funcionário com campos de condutor */}
      <Dialog open={empDialogOpen} onOpenChange={o => { setEmpDialogOpen(o); if (!o) resetEmpForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEmp ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Foto */}
            <div className="col-span-2 flex items-center gap-4">
              <Avatar className="w-20 h-20 rounded-full border-2 border-border">
                <AvatarImage src={empForm.photoUrl} alt={empForm.name} />
                <AvatarFallback className="bg-muted text-muted-foreground"><Camera className="w-6 h-6" /></AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label>Foto do Funcionário</Label>
                <FileUpload category="veiculo" refId={editingEmp?.id?.toString() || "new"} onUploaded={(url) => setEmpForm(f => ({ ...f, photoUrl: url }))} label="Enviar Foto" />
              </div>
            </div>

            {/* Dados Profissionais */}
            <div className="col-span-2 mt-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Dados Profissionais</p>
            </div>
            <div className="col-span-2"><Label>Nome *</Label><Input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>CEP</Label><Input value={empForm.zipCode} onChange={e => setEmpForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="00000-000" maxLength={10} /></div>
            <div><Label>Cargo</Label><Input value={empForm.position} onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))} placeholder="Técnico, Analista..." /></div>
            <div><Label>Departamento</Label><Input value={empForm.department} onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))} /></div>
            <div><Label>Perfil de Acesso *</Label>
              <Select value={empForm.role} onValueChange={v => setEmpForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="especialista">Especialista</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data de Admissão</Label><Input type="date" value={empForm.hireDate} onChange={e => setEmpForm(f => ({ ...f, hireDate: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={empForm.status} onValueChange={v => setEmpForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>{editingEmp ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label><Input type="password" value={empForm.password} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>

            {/* Dados Pessoais (migrados de Condutores) */}
            <div className="col-span-2 mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Dados Pessoais (Condutor)</p>
              <p className="text-xs text-muted-foreground/70 mb-2">Anexos de CNH, seguro de vida e plano de saúde permanecem em Documentos → Condutores.</p>
            </div>
            <div><Label>CPF</Label><Input value={empForm.cpf} onChange={e => setEmpForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
            <div><Label>CNH Número</Label><Input value={empForm.cnhNumber} onChange={e => setEmpForm(f => ({ ...f, cnhNumber: e.target.value }))} /></div>
            <div><Label>Categoria CNH</Label><Input value={empForm.cnhCategory} onChange={e => setEmpForm(f => ({ ...f, cnhCategory: e.target.value }))} maxLength={4} placeholder="AB, B, etc." /></div>
            <div><Label>Validade CNH</Label><Input type="date" value={empForm.cnhExpiry} onChange={e => setEmpForm(f => ({ ...f, cnhExpiry: e.target.value }))} /></div>
            <div><Label>Tipo Sanguíneo</Label><Input value={empForm.bloodType} onChange={e => setEmpForm(f => ({ ...f, bloodType: e.target.value }))} maxLength={5} placeholder="O+, A-, etc." /></div>
            <div><Label>CEP (Residencial)</Label><Input value={empForm.zipCode} onChange={e => setEmpForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="00000-000" maxLength={10} /></div>
            <div className="col-span-2"><Label>Endereço</Label><Input value={empForm.address} onChange={e => setEmpForm(f => ({ ...f, address: e.target.value }))} placeholder="Endereço completo" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEmpSubmit} disabled={createEmp.isPending || updateEmp.isPending}>{editingEmp ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
