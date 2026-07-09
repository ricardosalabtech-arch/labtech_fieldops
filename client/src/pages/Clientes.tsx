import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Clientes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [historyClient, setHistoryClient] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: clients } = trpc.clients.list.useQuery({ search: search || undefined });
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
    companyName: "", cnpj: "", address: "", city: "", state: "",
    responsibleName: "", responsibleEmail: "", phone: "", notes: "",
  });

  function resetForm() {
    setForm({ companyName: "", cnpj: "", address: "", city: "", state: "", responsibleName: "", responsibleEmail: "", phone: "", notes: "" });
    setEditingClient(null);
  }

  function openNew() { resetForm(); setDialogOpen(true); }

  function openEdit(c: any) {
    setEditingClient(c);
    setForm({
      companyName: c.companyName || "", cnpj: c.cnpj || "", address: c.address || "",
      city: c.city || "", state: c.state || "", responsibleName: c.responsibleName || "",
      responsibleEmail: c.responsibleEmail || "", phone: c.phone || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.companyName || !form.responsibleName || !form.responsibleEmail) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (editingClient) {
      updateClient.mutate({ id: editingClient.id, ...form });
    } else {
      createClient.mutate(form);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clients?.length ?? 0} cliente(s)</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="gap-2 rounded-lg">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por empresa, responsável ou CNPJ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-lg"
        />
      </div>

      {!clients || clients.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum cliente cadastrado</p>
            <Button onClick={openNew} className="mt-4 gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Cadastrar primeiro cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <Card key={c.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{c.companyName}</CardTitle>
                    {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Responsável:</span> {c.responsibleName}</p>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />{c.responsibleEmail}
                  </div>
                  {c.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                  {c.city && <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{c.city}{c.state ? ` - ${c.state}` : ""}</div>}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => { setHistoryClient(c); setHistoryOpen(true); }} className="gap-1 text-xs">
                    <History className="h-3 w-3" /> Histórico
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="gap-1 text-xs">
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover este cliente?")) deleteClient.mutate({ id: c.id }); }} className="gap-1 text-xs text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Empresa *</Label>
              <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
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
            <Button onClick={handleSubmit} disabled={createClient.isPending || updateClient.isPending}>
              {editingClient ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Visitas — {historyClient?.companyName}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {!history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma visita registrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{v.address}, {v.city}</p>
                      <p className="text-xs text-muted-foreground">{v.description || "Sem descrição"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{format(new Date(v.visitDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <p className="text-xs text-muted-foreground capitalize">{v.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
