import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, User, Plus, Pencil, Trash2, ShieldCheck, Users, Camera } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FileUpload from "@/components/FileUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Configuracoes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("perfil");
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();

  const createEmp = trpc.employees.create.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Funcionário cadastrado!"); setEmpDialogOpen(false); resetEmpForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateEmp = trpc.employees.update.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Funcionário atualizado!"); setEmpDialogOpen(false); resetEmpForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteEmp = trpc.employees.delete.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Funcionário removido"); },
  });

  const [empForm, setEmpForm] = useState({
    name: "", email: "", phone: "", position: "", department: "",
    hireDate: "", status: "ativo", role: "tecnico", password: "", photoUrl: "",
  });

  function resetEmpForm() {
    setEmpForm({ name: "", email: "", phone: "", position: "", department: "", hireDate: "", status: "ativo", role: "tecnico", password: "", photoUrl: "" });
    setEditingEmp(null);
  }

  function openEditEmp(e: any) {
    setEditingEmp(e);
    setEmpForm({
      name: e.name || "", email: e.email || "", phone: e.phone || "",
      position: e.position || "", department: e.department || "",
      hireDate: e.hireDate ? format(new Date(e.hireDate), "yyyy-MM-dd") : "",
      status: e.status || "ativo", role: e.role || "tecnico", password: "",
      photoUrl: e.photoUrl || "",
    });
    setEmpDialogOpen(true);
  }

  function handleEmpSubmit() {
    if (!empForm.name) { toast.error("Nome é obrigatório"); return; }
    if (!empForm.email) { toast.error("E-mail é obrigatório para login"); return; }
    if (!editingEmp && !empForm.password) { toast.error("Senha é obrigatória para novo funcionário"); return; }
    const data: any = {
      name: empForm.name, email: empForm.email || undefined, phone: empForm.phone || undefined,
      role: empForm.role,
      position: empForm.position || undefined, department: empForm.department || undefined,
      hireDate: empForm.hireDate ? new Date(empForm.hireDate + "T00:00:00").getTime() : undefined,
      status: empForm.status,
    };
    if (empForm.password) data.password = empForm.password;
    if (empForm.photoUrl) data.photoUrl = empForm.photoUrl;
    if (editingEmp) updateEmp.mutate({ id: editingEmp.id, ...data });
    else createEmp.mutate(data);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil e gestão de equipe</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="perfil" className="gap-1.5"><User className="h-4 w-4" /> Perfil</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="equipe" className="gap-1.5"><Users className="h-4 w-4" /> Equipe</TabsTrigger>
          )}
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Informações do Usuário</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[oklch(0.48_0.18_250)] flex items-center justify-center text-white text-xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-lg font-semibold">{user?.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || "—"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{user?.role || "user"}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="text-sm font-medium">{user?.id ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Último Acesso</Label>
                  <p className="text-sm font-medium">{user?.lastSignedIn ? format(new Date(user.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Sobre o Sistema</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Sistema:</span><span className="font-medium text-foreground">SA Labtech FieldOps</span></div>
              <div className="flex justify-between"><span>Versão:</span><span className="font-medium text-foreground">1.0.0</span></div>
              <div className="flex justify-between"><span>Módulos:</span><span className="font-medium text-foreground">9 ativos</span></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipe (Admin only) */}
        {isAdmin && (
          <TabsContent value="equipe" className="space-y-4">
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
                {employees.map(e => (
                  <Card key={e.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 rounded-lg">
                          <AvatarImage src={e.photoUrl ?? undefined} alt={e.name} />
                          <AvatarFallback className="bg-indigo-100">
                            <User className="h-5 w-5 text-indigo-600" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-sm font-semibold">{e.name}</CardTitle>
                          {e.position && <p className="text-xs text-muted-foreground">{e.position}</p>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${e.role === "administrador" ? "bg-blue-100 text-blue-700" : e.role === "especialista" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>
                            {e.role}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${e.status === "ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {e.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      {e.email && <p>{e.email}</p>}
                      {e.phone && <p>{e.phone}</p>}
                      {e.department && <p>Depto: {e.department}</p>}
                      {e.hireDate && <p>Admissão: {format(new Date(e.hireDate), "dd/MM/yyyy", { locale: ptBR })}</p>}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => openEditEmp(e)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>}
                          title="Remover Funcionário"
                          description={`Tem certeza que deseja remover ${e.name}? Esta ação não pode ser desfeita.`}
                          onConfirm={() => deleteEmp.mutate({ id: e.id })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog Funcionário */}
      <Dialog open={empDialogOpen} onOpenChange={o => { setEmpDialogOpen(o); if (!o) resetEmpForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEmp ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Photo upload */}
            <div className="col-span-2 flex items-center gap-4">
              <Avatar className="w-20 h-20 rounded-full border-2 border-border">
                <AvatarImage src={empForm.photoUrl} alt={empForm.name} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <Camera className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label>Foto do Funcionário</Label>
                <FileUpload
                  category="veiculo"
                  refId={editingEmp?.id?.toString() || "new"}
                  onUploaded={(url) => setEmpForm(f => ({ ...f, photoUrl: url }))}
                  label="Enviar Foto"
                />
              </div>
            </div>
            <div className="col-span-2"><Label>Nome *</Label><Input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} /></div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEmpSubmit} disabled={createEmp.isPending || updateEmp.isPending}>{editingEmp ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
