import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Plus, MapPin, Calendar, Trash2, Pencil, DollarSign, FileCheck, Upload } from "lucide-react";
import WazeLink from "@/components/WazeLink";
import WeatherWidget from "@/components/WeatherWidget";
import FileUpload from "@/components/FileUpload";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  confirmada: { label: "Confirmada", color: "bg-green-100 text-green-700 border-green-200" },
  pendente: { label: "Pendente", color: "bg-orange-100 text-orange-700 border-orange-200" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function Reservas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const utils = trpc.useUtils();
  const { data: reservations } = trpc.hotelReservations.list.useQuery({ status: filterStatus !== "all" ? filterStatus : undefined });
  const { data: trips } = trpc.trips.list.useQuery();
  const { data: visits } = trpc.visits.list.useQuery();

  const createRes = trpc.hotelReservations.create.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva criada!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateRes = trpc.hotelReservations.update.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva atualizada!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteRes = trpc.hotelReservations.delete.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva removida"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const [form, setForm] = useState({
    tripId: "", visitId: "", hotelName: "", city: "",
    checkIn: "", checkOut: "", confirmationNumber: "",
    value: "0.00", observations: "", status: "pendente", voucherUrl: "",
  });

  function resetForm() {
    setForm({ tripId: "", visitId: "", hotelName: "", city: "", checkIn: "", checkOut: "", confirmationNumber: "", value: "0.00", observations: "", status: "pendente", voucherUrl: "" });
    setEditing(null);
  }

  function openNew() { resetForm(); setDialogOpen(true); }

  function openEdit(r: any) {
    setEditing(r);
    setForm({
      tripId: r.tripId?.toString() || "", visitId: r.visitId?.toString() || "",
      hotelName: r.hotelName || "", city: r.city || "",
      checkIn: r.checkIn ? format(new Date(r.checkIn), "yyyy-MM-dd") : "",
      checkOut: r.checkOut ? format(new Date(r.checkOut), "yyyy-MM-dd") : "",
      confirmationNumber: r.confirmationNumber || "", value: r.value?.toString() || "0.00",
      observations: r.observations || "", status: r.status || "pendente", voucherUrl: r.voucherUrl || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.hotelName || !form.city || !form.checkIn || !form.checkOut) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    const data: any = {
      tripId: form.tripId ? parseInt(form.tripId) : undefined,
      visitId: form.visitId ? parseInt(form.visitId) : undefined,
      hotelName: form.hotelName, city: form.city,
      checkIn: new Date(form.checkIn + "T00:00:00").getTime(),
      checkOut: new Date(form.checkOut + "T00:00:00").getTime(),
      confirmationNumber: form.confirmationNumber || undefined,
      value: form.value, observations: form.observations || undefined,
      status: form.status, voucherUrl: form.voucherUrl || undefined,
    };
    if (editing) updateRes.mutate({ id: editing.id, ...data });
    else createRes.mutate(data);
  }

  const filters = [
    { label: "Todas", value: "all" },
    { label: "Confirmadas", value: "confirmada" },
    { label: "Pendentes", value: "pendente" },
    { label: "Canceladas", value: "cancelada" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Reservas de Hotel</h1>
          <p className="text-sm text-muted-foreground">{reservations?.length ?? 0} reserva(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" /> Nova Reserva
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterStatus === f.value ? "bg-[oklch(0.48_0.18_250)] text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
            }`}>{f.label}</button>
        ))}
      </div>

      {!reservations || reservations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BedDouble className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma reserva cadastrada</p>
            <Button onClick={openNew} className="mt-4 gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Criar primeira reserva
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.map(r => {
            const sc = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pendente;
            return (
              <Card key={r.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                      <BedDouble className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{r.hotelName}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Check-in: {format(new Date(r.checkIn), "dd/MM/yyyy", { locale: ptBR })}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Check-out: {format(new Date(r.checkOut), "dd/MM/yyyy", { locale: ptBR })}</div>
                    {r.confirmationNumber && <p className="text-xs">Confirmação: {r.confirmationNumber}</p>}
                    <div className="flex items-center gap-1.5 font-medium text-foreground"><DollarSign className="h-3.5 w-3.5" />R$ {Number(r.value).toFixed(2)}</div>
                  </div>
                  {r.city && <WeatherWidget city={r.city} compact />}
                  {r.voucherUrl && (
                    <a href={r.voucherUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-teal-600 hover:underline pt-1">
                      <FileCheck className="h-3.5 w-3.5" /> Ver voucher da reserva
                    </a>
                  )}
                  <div className="pt-2 border-t">
                    <FileUpload
                      category="voucher"
                      refId={r.id}
                      label="Anexar voucher desta reserva"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onUploaded={(doc) => {
                        updateRes.mutate({ id: r.id, voucherUrl: doc.fileUrl });
                      }}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <WazeLink address={r.hotelName} city={r.city} />
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover reserva?")) deleteRes.mutate({ id: r.id }); }} className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Reserva" : "Nova Reserva de Hotel"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><Label>Hotel *</Label><Input value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Nome do hotel" /></div>
            <div><Label>Cidade *</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>Número de Confirmação</Label><Input value={form.confirmationNumber} onChange={e => setForm(f => ({ ...f, confirmationNumber: e.target.value }))} /></div>
            <div><Label>Check-in *</Label><Input type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} /></div>
            <div><Label>Check-out *</Label><Input type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Viagem Associada</Label>
              <Select value={form.tripId} onValueChange={v => setForm(f => ({ ...f, tripId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {trips?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.employeeName} — {format(new Date(t.departureDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Visita Associada</Label>
              <Select value={form.visitId} onValueChange={v => setForm(f => ({ ...f, visitId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {visits?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.clientName} — {format(new Date(v.visitDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Voucher da Reserva</Label>
              {form.voucherUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <a href={form.voucherUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 hover:underline truncate flex-1">Voucher anexado</a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, voucherUrl: "" }))} className="text-xs text-destructive">Remover</Button>
                </div>
              ) : (
                <FileUpload category="voucher" refId={editing?.id} label="Anexar voucher (PDF, imagem)" accept=".pdf,.jpg,.jpeg,.png" onUploaded={(doc) => setForm(f => ({ ...f, voucherUrl: doc.fileUrl }))} />
              )}
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createRes.isPending || updateRes.isPending}>{editing ? "Salvar" : "Criar Reserva"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
