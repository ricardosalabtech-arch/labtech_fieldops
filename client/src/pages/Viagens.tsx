import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Plus, MapPin, Calendar, Trash2, Pencil, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  planejada: { label: "Planejada", color: "border-blue-300 text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  em_andamento: { label: "Em Andamento", color: "border-orange-300 text-orange-700", bg: "bg-orange-50", dot: "bg-orange-500" },
  concluida: { label: "Concluída", color: "border-green-300 text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
  cancelada: { label: "Cancelada", color: "border-red-300 text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
};

const columns = [
  { key: "all", label: "Todas" },
  { key: "planejada", label: "Planejada" },
  { key: "em_andamento", label: "Em Andamento" },
  { key: "concluida", label: "Concluída" },
  { key: "cancelada", label: "Cancelada" },
];

export default function Viagens() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: trips } = trpc.trips.list.useQuery();
  const { data: visits } = trpc.visits.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); toast.success("Viagem criada!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateTrip = trpc.trips.update.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); toast.success("Viagem atualizada!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteTrip = trpc.trips.delete.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); toast.success("Viagem removida"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const [form, setForm] = useState({
    visitId: "", employeeId: "", employeeName: "",
    transportMode: "carro_empresa", vehicleInfo: "",
    departureDate: "", returnDate: "", returnAddress: "",
    status: "planejada", notes: "",
  });

  function resetForm() {
    setForm({ visitId: "", employeeId: "", employeeName: "", transportMode: "carro_empresa", vehicleInfo: "", departureDate: "", returnDate: "", returnAddress: "", status: "planejada", notes: "" });
    setEditingTrip(null);
  }

  function openNew() { resetForm(); setDialogOpen(true); }

  function openEdit(t: any) {
    setEditingTrip(t);
    setForm({
      visitId: t.visitId?.toString() || "", employeeId: t.employeeId?.toString() || "", employeeName: t.employeeName || "",
      transportMode: t.transportMode || "carro_empresa", vehicleInfo: t.vehicleInfo || "",
      departureDate: t.departureDate ? format(new Date(t.departureDate), "yyyy-MM-dd") : "",
      returnDate: t.returnDate ? format(new Date(t.returnDate), "yyyy-MM-dd") : "",
      returnAddress: t.returnAddress || "", status: t.status || "planejada", notes: t.notes || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.departureDate) { toast.error("Data de saída é obrigatória"); return; }
    const data: any = {
      visitId: form.visitId ? parseInt(form.visitId) : undefined,
      employeeId: form.employeeId ? parseInt(form.employeeId) : undefined,
      employeeName: form.employeeName || undefined,
      transportMode: form.transportMode,
      vehicleInfo: form.vehicleInfo || undefined,
      departureDate: new Date(form.departureDate + "T00:00:00").getTime(),
      returnDate: form.returnDate ? new Date(form.returnDate + "T00:00:00").getTime() : undefined,
      returnAddress: form.returnAddress || undefined,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editingTrip) updateTrip.mutate({ id: editingTrip.id, ...data });
    else createTrip.mutate(data);
  }

  const tripsByStatus = (status: string) => {
    if (!trips) return [];
    if (status === "all") return trips;
    return trips.filter(t => t.status === status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Viagens</h1>
          <p className="text-sm text-muted-foreground">{trips?.length ?? 0} viagem(ns)</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" /> Nova Viagem
        </Button>
      </div>

      {!trips || trips.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Car className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma viagem cadastrada</p>
            <Button onClick={openNew} className="mt-4 gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Criar primeira viagem
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {columns.map(col => {
            const colTrips = tripsByStatus(col.key);
            const sc = col.key !== "all" ? statusConfig[col.key as keyof typeof statusConfig] : null;
            return (
              <div key={col.key} className="space-y-3">
                <div className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${
                  col.key === "all" ? "bg-[oklch(0.48_0.18_250)] text-white" : `bg-white border-2 ${sc?.color}`
                }`}>
                  {col.label} ({colTrips.length})
                </div>
                <div className="space-y-2">
                  {colTrips.map(t => {
                    const tsc = statusConfig[t.status as keyof typeof statusConfig] || statusConfig.planejada;
                    return (
                      <Card key={t.id} className={`border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${tsc.color.replace("text-", "border-l-").split(" ")[0]}`}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="text-sm font-medium">{t.employeeName || "Sem responsável"}</div>
                            <div className={`text-[10px] px-2 py-0.5 rounded-full ${tsc.bg} ${tsc.color}`}>{tsc.label}</div>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(t.departureDate), "dd/MM/yyyy", { locale: ptBR })}</div>
                            {t.returnDate && <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />Retorno: {format(new Date(t.returnDate), "dd/MM/yyyy", { locale: ptBR })}</div>}
                            {t.vehicleInfo && <div className="flex items-center gap-1"><Car className="h-3 w-3" />{t.vehicleInfo}</div>}
                            {t.returnAddress && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.returnAddress}</div>}
                          </div>
                          <div className="flex gap-1 pt-1 border-t">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(t)} className="h-6 text-xs gap-1"><Pencil className="h-2.5 w-2.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover viagem?")) deleteTrip.mutate({ id: t.id }); }} className="h-6 text-xs gap-1 text-destructive"><Trash2 className="h-2.5 w-2.5" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTrip ? "Editar Viagem" : "Nova Viagem"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Visita Associada</Label>
              <Select value={form.visitId} onValueChange={v => setForm(f => ({ ...f, visitId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione uma visita" /></SelectTrigger>
                <SelectContent>
                  {visits?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.clientName} — {format(new Date(v.visitDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={form.employeeId} onValueChange={v => { const emp = employees?.find(e => e.id.toString() === v); setForm(f => ({ ...f, employeeId: v, employeeName: emp?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meio de Transporte</Label>
              <Select value={form.transportMode} onValueChange={v => setForm(f => ({ ...f, transportMode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro_empresa">Carro da Empresa</SelectItem>
                  <SelectItem value="transporte_publico">Transporte Público</SelectItem>
                  <SelectItem value="app">Aplicativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Veículo</Label><Input value={form.vehicleInfo} onChange={e => setForm(f => ({ ...f, vehicleInfo: e.target.value }))} placeholder="Modelo / Placa" /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data de Saída *</Label><Input type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} /></div>
            <div><Label>Data de Retorno</Label><Input type="date" value={form.returnDate} onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Endereço de Retorno</Label><Input value={form.returnAddress} onChange={e => setForm(f => ({ ...f, returnAddress: e.target.value }))} placeholder="Endereço de retorno" /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createTrip.isPending || updateTrip.isPending}>
              {editingTrip ? "Salvar" : "Criar Viagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
