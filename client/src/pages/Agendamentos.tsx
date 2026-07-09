import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, MapPin, Clock, User } from "lucide-react";
import WazeLink from "@/components/WazeLink";
import WeatherWidget from "@/components/WeatherWidget";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addMonths, isSameDay, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig = {
  agendado: { label: "Agendado", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  em_andamento: { label: "Em Andamento", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};

export default function Agendamentos() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: visits } = trpc.visits.list.useQuery({
    status: filterStatus !== "all" ? filterStatus : undefined,
  });
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();

  const createVisit = trpc.visits.create.useMutation({
    onSuccess: () => { utils.visits.list.invalidate(); toast.success("Visita agendada com sucesso!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro ao agendar visita: " + e.message),
  });
  const updateVisit = trpc.visits.update.useMutation({
    onSuccess: () => { utils.visits.list.invalidate(); toast.success("Visita atualizada!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message),
  });

  const [form, setForm] = useState({
    clientName: "", clientId: "", address: "", city: "", state: "",
    visitDate: "", scheduledTime: "", employeeId: "", employeeName: "",
    transportMode: "carro_empresa", description: "", notes: "",
  });

  function resetForm() {
    setForm({ clientName: "", clientId: "", address: "", city: "", state: "", visitDate: "", scheduledTime: "", employeeId: "", employeeName: "", transportMode: "carro_empresa", description: "", notes: "" });
    setEditingVisit(null);
    setSelectedDate(null);
  }

  function openNewVisit(date?: Date) {
    resetForm();
    setSelectedDate(date || new Date());
    setForm(f => ({ ...f, visitDate: format(date || new Date(), "yyyy-MM-dd") }));
    setDialogOpen(true);
  }

  function openEditVisit(visit: any) {
    setEditingVisit(visit);
    setForm({
      clientName: visit.clientName || "",
      clientId: visit.clientId?.toString() || "",
      address: visit.address || "",
      city: visit.city || "",
      state: visit.state || "",
      visitDate: format(new Date(visit.visitDate), "yyyy-MM-dd"),
      scheduledTime: visit.scheduledTime || "",
      employeeId: visit.employeeId?.toString() || "",
      employeeName: visit.employeeName || "",
      transportMode: visit.transportMode || "carro_empresa",
      description: visit.description || "",
      notes: visit.notes || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.clientName || !form.address || !form.city || !form.visitDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    const data: any = {
      clientName: form.clientName,
      clientId: form.clientId ? parseInt(form.clientId) : undefined,
      address: form.address,
      city: form.city,
      state: form.state || undefined,
      visitDate: new Date(form.visitDate + "T00:00:00").getTime(),
      scheduledTime: form.scheduledTime || undefined,
      employeeId: form.employeeId ? parseInt(form.employeeId) : undefined,
      employeeName: form.employeeName || undefined,
      transportMode: form.transportMode,
      description: form.description || undefined,
      notes: form.notes || undefined,
    };
    if (editingVisit) {
      updateVisit.mutate({ id: editingVisit.id, ...data });
    } else {
      createVisit.mutate(data);
    }
  }

  // Calendar logic
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  const filteredVisits = useMemo(() => {
    if (!visits) return [];
    return visits.filter(v => {
      if (filterPeriod === "today") return isSameDay(new Date(v.visitDate), new Date());
      if (filterPeriod === "week") {
        const ws = startOfWeek(new Date(), { weekStartsOn: 0 });
        const we = endOfWeek(new Date(), { weekStartsOn: 0 });
        const vd = new Date(v.visitDate);
        return vd >= ws && vd <= we;
      }
      if (filterPeriod === "month") return isSameMonth(new Date(v.visitDate), new Date());
      return true;
    });
  }, [visits, filterPeriod]);

  const visitsForDay = (day: Date) => filteredVisits.filter(v => isSameDay(new Date(v.visitDate), day));

  const periodFilters = [
    { label: "Todos os períodos", value: "all" },
    { label: "Hoje", value: "today" },
    { label: "Esta semana", value: "week" },
    { label: "Este mês", value: "month" },
  ];
  const statusFilters = [
    { label: "Todos", value: "all" },
    { label: "Agendado", value: "agendado" },
    { label: "Em Andamento", value: "em_andamento" },
    { label: "Concluído", value: "concluido" },
    { label: "Cancelado", value: "cancelado" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">{filteredVisits.length} visita(s)</p>
        </div>
        <Button onClick={() => openNewVisit()} className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" /> Nova Visita
        </Button>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {periodFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterPeriod(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterPeriod === f.value
                  ? "bg-[oklch(0.48_0.18_250)] text-white shadow-sm"
                  : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterStatus === f.value
                  ? "bg-[oklch(0.48_0.18_250)] text-white shadow-sm"
                  : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-muted/60 rounded-lg p-0.5">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 text-sm rounded-md transition-all ${view === "month" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"}`}
          >Mês</button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 text-sm rounded-md transition-all ${view === "week" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"}`}
          >Semana</button>
        </div>
      </div>

      {/* Calendar */}
      {filteredVisits.length === 0 && !visits?.length ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma visita encontrada</p>
            <Button onClick={() => openNewVisit()} className="mt-4 gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Agendar primeira visita
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, view === "month" ? -1 : 0))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, view === "month" ? 1 : 0))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {view === "month" ? (
              <div>
                <div className="grid grid-cols-7 border-b">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                    <div key={d} className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    const dayVisits = visitsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={i}
                        className={`min-h-[100px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${
                          !isCurrentMonth ? "bg-muted/20" : ""
                        } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
                        onClick={() => openNewVisit(day)}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday ? "w-6 h-6 rounded-full bg-[oklch(0.48_0.18_250)] text-white flex items-center justify-center" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/40"}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-1">
                          {dayVisits.slice(0, 3).map(v => {
                            const sc = statusConfig[v.status as keyof typeof statusConfig] || statusConfig.agendado;
                            return (
                              <div
                                key={v.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded truncate ${sc.color} border cursor-pointer`}
                                onClick={(e) => { e.stopPropagation(); openEditVisit(v); }}
                              >
                                {v.scheduledTime && <span className="font-medium">{v.scheduledTime} </span>}
                                {v.clientName}
                              </div>
                            );
                          })}
                          {dayVisits.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayVisits.length - 3} mais</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 p-3">
                {weekDays.map((day, i) => {
                  const dayVisits = visitsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={i} className="min-h-[300px] rounded-lg bg-muted/20 p-2">
                      <div className={`text-xs font-semibold mb-2 ${isToday ? "text-[oklch(0.48_0.18_250)]" : "text-muted-foreground"}`}>
                        {format(day, "EEE", { locale: ptBR })}
                        <div className="text-lg text-foreground">{format(day, "d")}</div>
                      </div>
                      <div className="space-y-1.5">
                        {dayVisits.map(v => {
                          const sc = statusConfig[v.status as keyof typeof statusConfig] || statusConfig.agendado;
                          return (
                            <div
                              key={v.id}
                              className={`text-xs p-2 rounded-lg ${sc.color} border cursor-pointer hover:shadow-sm transition-shadow`}
                              onClick={() => openEditVisit(v)}
                            >
                              <div className="font-medium truncate">{v.clientName}</div>
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-80">
                                <MapPin className="h-2.5 w-2.5" />{v.city}
                              </div>
                              {v.scheduledTime && (
                                <div className="flex items-center gap-1 text-[10px] opacity-80">
                                  <Clock className="h-2.5 w-2.5" />{v.scheduledTime}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Nova/Editar Visita */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVisit ? "Editar Visita" : "Nova Visita Técnica"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Cliente *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => {
                  const c = clients?.find(c => c.id.toString() === v);
                  setForm(f => ({ ...f, clientId: v, clientName: c?.companyName || f.clientName, address: c?.address || f.address, city: c?.city || f.city, state: c?.state || f.state }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clients?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="mt-2" placeholder="Ou digite o nome do cliente" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Endereço *</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Endereço completo" />
            </div>
            <div>
              <Label>Cidade *</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="UF" maxLength={3} />
            </div>
            <div>
              <Label>Data da Visita *</Label>
              <Input type="date" value={form.visitDate} onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} />
            </div>
            <div>
              <Label>Hora Agendada</Label>
              <Input type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} />
            </div>
            <div>
              <Label>Técnico/Responsável</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => {
                  const emp = employees?.find(e => e.id.toString() === v);
                  setForm(f => ({ ...f, employeeId: v, employeeName: emp?.name || "" }));
                }}
              >
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
                  <SelectItem value="aviao">Avião</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.city && (
              <div className="col-span-2">
                <WeatherWidget city={form.city} date={form.visitDate ? new Date(form.visitDate) : undefined} compact={false} />
              </div>
            )}
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da visita técnica" rows={3} />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionais" rows={2} />
            </div>
          </div>
          {form.address && form.city && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <WazeLink address={form.address} city={form.city} label="Abrir endereço no Waze" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createVisit.isPending || updateVisit.isPending}>
              {editingVisit ? "Salvar Alterações" : "Agendar Visita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
