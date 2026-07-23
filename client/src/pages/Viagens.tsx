import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Plus, MapPin, Calendar, Trash2, Pencil, Plane, Hotel, Navigation, ChevronDown, ChevronRight, ClipboardCheck, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TransportBadge from "@/components/TransportBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import WazeLink from "@/components/WazeLink";
import WeatherWidget from "@/components/WeatherWidget";
import FileUpload from "@/components/FileUpload";
import { FileCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import PeriodFilter, { PeriodValue, filterByPeriod } from "@/components/PeriodFilter";
import PainelViagem from "@/components/PainelViagem";
import { useMemo } from "react";

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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodValue>("all");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);
  const [hotelForTrip, setHotelForTrip] = useState<number | null>(null);
  const [flightDialogOpen, setFlightDialogOpen] = useState(false);
  const [flightForTrip, setFlightForTrip] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: trips, isLoading: tripsLoading } = trpc.trips.list.useQuery();
  const { data: visits } = trpc.visits.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: hotelReservations } = trpc.hotelReservations.list.useQuery();
  const { data: flights } = trpc.flightBookings.list.useQuery();
  const { data: checklists } = trpc.checklists.list.useQuery();
  const { data: expenses } = trpc.expenses.list.useQuery();

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
  });

  // Hotel mutations
  const createHotel = trpc.hotelReservations.create.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva adicionada!"); setHotelDialogOpen(false); resetHotelForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // Flight mutations
  const createFlight = trpc.flightBookings.create.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Passagem adicionada!"); setFlightDialogOpen(false); resetFlightForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteFlight = trpc.flightBookings.delete.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Passagem removida"); },
  });

  const [form, setForm] = useState({
    visitId: "", employeeId: "", employeeName: "",
    transportMode: "carro_empresa", vehicleInfo: "",
    departureDate: "", returnDate: "", returnAddress: "",
    status: "planejada", notes: "",
  });

  const [hotelForm, setHotelForm] = useState({
    hotelName: "", city: "", checkIn: "", checkOut: "",
    confirmationNumber: "", value: "0.00", observations: "", status: "pendente",
  });

  const [flightForm, setFlightForm] = useState({
    airline: "", flightNumber: "", originAirport: "", destinationAirport: "",
    originCity: "", destinationCity: "", departureDateTime: "", arrivalDateTime: "",
    seat: "", gate: "", bookingCode: "", passengerName: "", value: "0.00",
    status: "pendente", notes: "", voucherUrl: "",
  });

  function resetForm() {
    setForm({ visitId: "", employeeId: "", employeeName: "", transportMode: "carro_empresa", vehicleInfo: "", departureDate: "", returnDate: "", returnAddress: "", status: "planejada", notes: "" });
    setEditingTrip(null);
  }

  function resetHotelForm() {
    setHotelForm({ hotelName: "", city: "", checkIn: "", checkOut: "", confirmationNumber: "", value: "0.00", observations: "", status: "pendente" });
    setHotelForTrip(null);
  }

  function resetFlightForm() {
    setFlightForm({ airline: "", flightNumber: "", originAirport: "", destinationAirport: "", originCity: "", destinationCity: "", departureDateTime: "", arrivalDateTime: "", seat: "", gate: "", bookingCode: "", passengerName: "", value: "0.00", status: "pendente", notes: "", voucherUrl: "" });
    setFlightForTrip(null);
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
    if (!form.transportMode?.trim()) { toast.error("Selecione o meio de transporte"); return; }
    if (form.returnDate && form.departureDate && new Date(form.returnDate) < new Date(form.departureDate)) {
      toast.error("Data de retorno deve ser posterior à data de saída"); return;
    }
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

  function handleHotelSubmit() {
    if (!hotelForm.hotelName || !hotelForm.city || !hotelForm.checkIn || !hotelForm.checkOut) {
      toast.error("Preencha hotel, cidade, check-in e check-out");
      return;
    }
    createHotel.mutate({
      tripId: hotelForTrip || undefined,
      hotelName: hotelForm.hotelName,
      city: hotelForm.city,
      checkIn: new Date(hotelForm.checkIn + "T14:00:00").getTime(),
      checkOut: new Date(hotelForm.checkOut + "T12:00:00").getTime(),
      confirmationNumber: hotelForm.confirmationNumber || undefined,
      value: hotelForm.value || "0.00",
      observations: hotelForm.observations || undefined,
      status: hotelForm.status as any,
    });
  }

  const updateFlightVoucher = trpc.flightBookings.update.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Voucher do voo anexado!"); },
    onError: (e: any) => toast.error("Erro ao atualizar voucher: " + e.message),
  });

  function handleFlightSubmit() {
    if (!flightForm.airline || !flightForm.flightNumber || !flightForm.originAirport || !flightForm.destinationAirport || !flightForm.departureDateTime) {
      toast.error("Preencha companhia, voo, aeroportos e data de partida");
      return;
    }
    createFlight.mutate({
      tripId: flightForTrip || undefined,
      airline: flightForm.airline,
      flightNumber: flightForm.flightNumber,
      originAirport: flightForm.originAirport,
      destinationAirport: flightForm.destinationAirport,
      originCity: flightForm.originCity || undefined,
      destinationCity: flightForm.destinationCity || undefined,
      departureDateTime: new Date(flightForm.departureDateTime).getTime(),
      arrivalDateTime: flightForm.arrivalDateTime ? new Date(flightForm.arrivalDateTime).getTime() : undefined,
      seat: flightForm.seat || undefined,
      gate: flightForm.gate || undefined,
      bookingCode: flightForm.bookingCode || undefined,
      passengerName: flightForm.passengerName || undefined,
      value: flightForm.value || "0.00",
      status: flightForm.status as any,
      notes: flightForm.notes || undefined,
      voucherUrl: flightForm.voucherUrl || undefined,
    });
  }

  const filteredTrips = useMemo(() => filterByPeriod(trips || [], period, (t: any) => new Date(t.departureDate), customRange), [trips, period, customRange]);

  const tripsByStatus = (status: string) => {
    if (status === "all") return filteredTrips;
    return filteredTrips.filter(t => t.status === status);
  };

  const getTripHotels = (tripId: number) => hotelReservations?.filter(h => h.tripId === tripId) || [];
  const getTripFlights = (tripId: number) => flights?.filter(f => f.tripId === tripId) || [];
  const getTripVisit = (visitId: number | null) => visits?.find(v => v.id === visitId);

  // Checklist do veículo e ferramentas por viagem
  const vehicleChecklistItems = [
    "Abastecimento completo",
    "Óleo e água verificados",
    "Pneus calibrados (incluindo estepe)",
    "Documentos do veículo (CRLV)",
    "Extintor e macaco",
    "Cintos de segurança",
    "Ferramentas de calibração",
    "Multímetro / Instrumentos",
    "Padrões de calibração",
    "EPIs (luvas, óculos, calçado)",
  ];

  const getTripChecklist = (tripId: number) => {
    const trip = trips?.find(t => t.id === tripId);
    if (!trip?.visitId) return null;
    return checklists?.find(c => c.visitId === trip.visitId && c.title === "Checklist do Veículo e Ferramentas") || null;
  };

  const parseChecklistItems = (itemsStr: string): boolean[] => {
    try { return JSON.parse(itemsStr); } catch { return []; }
  };

  const createChecklist = trpc.checklists.create.useMutation({
    onSuccess: () => { utils.checklists.list.invalidate(); toast.success("Checklist salvo!"); },
    onError: (e) => toast.error("Erro ao salvar checklist: " + e.message),
  });
  const updateChecklist = trpc.checklists.update.useMutation({
    onSuccess: () => { utils.checklists.list.invalidate(); },
    onError: (e) => toast.error("Erro ao atualizar checklist: " + e.message),
  });

  function toggleChecklistItem(tripId: number, itemIndex: number) {
    const existing = getTripChecklist(tripId);
    if (!existing) return;
    const items = parseChecklistItems(existing.items);
    items[itemIndex] = !items[itemIndex];
    updateChecklist.mutate({ id: existing.id, items: JSON.stringify(items) });
  }

  function initChecklist(tripId: number) {
    const trip = trips?.find(t => t.id === tripId);
    if (!trip?.visitId) { toast.error("Esta viagem não tem visita associada"); return; }
    const existing = getTripChecklist(tripId);
    if (existing) return;
    createChecklist.mutate({
      visitId: trip.visitId,
      title: "Checklist do Veículo e Ferramentas",
      items: JSON.stringify(vehicleChecklistItems.map(() => false)),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Viagens</h1>
          <p className="text-sm text-muted-foreground">{filteredTrips.length} viagem(ns) · {flights?.length ?? 0} voo(s) · {hotelReservations?.length ?? 0} reserva(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" /> Nova Viagem
        </Button>
      </div>

      {/* Filtro de Período */}
      <PeriodFilter value={period} onChange={(v, r) => { setPeriod(v); if (r) setCustomRange(r); }} />

      {tripsLoading ? (
        <LoadingSkeleton type="list" count={3} />
      ) : !trips || trips.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent>
            <EmptyState icon={Car} title="Nenhuma viagem cadastrada" description="Crie a primeira viagem para seus técnicos e especialistas." action={<Button onClick={openNew} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Criar primeira viagem</Button>} />
          </CardContent>
        </Card>
      ) : (
        <>
        {filteredTrips.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent>
              <EmptyState icon={Car} title="Nenhuma viagem no período" description="Ajuste o filtro de período para ver mais viagens." />
            </CardContent>
          </Card>
        ) : (
        <div className="space-y-4">
          {filteredTrips.map(t => {
            const tsc = statusConfig[t.status as keyof typeof statusConfig] || statusConfig.planejada;
            const isExpanded = expandedTrip === t.id;
            const tripHotels = getTripHotels(t.id);
            const tripFlights = getTripFlights(t.id);
            const visit = t.visitId ? getTripVisit(t.visitId) : null;
            const destCity = visit?.city || t.returnAddress || "";

            return (
              <Card key={t.id} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedTrip(isExpanded ? null : t.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tsc.bg}`}>
                        {t.transportMode === "aviao" ? <Plane className="h-5 w-5 text-indigo-600" /> : <Car className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{t.employeeName || "Sem responsável"}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${tsc.bg} ${tsc.color}`}>{tsc.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(t.departureDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                          {t.returnDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Retorno: {format(new Date(t.returnDate), "dd/MM/yyyy", { locale: ptBR })}</span>}
                          {destCity && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{destCity}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <TransportBadge mode={t.transportMode} />
                      {visit && <WazeLink address={visit.address} city={visit.city} />}
                      {isAdmin && <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => openEdit(t)} className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>}
                      {isAdmin && <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-7 w-7 p-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>} title="Remover viagem?" description={`Remover a viagem de ${t.employeeName || "sem responsável"}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteTrip.mutate({ id: t.id })} />}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t bg-slate-50/30 p-4 space-y-4">
                      {/* Painel da Viagem */}
                      <PainelViagem
                        trip={t}
                        visit={visit}
                        hotels={tripHotels}
                        flights={tripFlights}
                        expenses={expenses?.filter(e => e.tripId === t.id) || []}
                      />

                      {/* Weather + Transport info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {destCity && (
                          <div className="md:col-span-1">
                            <WeatherWidget city={destCity} date={new Date(t.departureDate)} compact={false} />
                          </div>
                        )}
                        <div className="md:col-span-2 space-y-3">
                          {/* Flights section */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold flex items-center gap-1.5"><Plane className="h-4 w-4 text-indigo-600" /> Passagens de Avião</h4>
                              <Button size="sm" variant="outline" onClick={() => { setFlightForTrip(t.id); setFlightDialogOpen(true); }} className="h-7 gap-1 text-xs">
                                <Plus className="h-3 w-3" /> Adicionar Voo
                              </Button>
                            </div>
                            {tripFlights.length === 0 ? (
                              <p className="text-xs text-muted-foreground/60 py-2">Nenhum voo cadastrado</p>
                            ) : (
                              <div className="space-y-2">
                                {tripFlights.map(f => (
                                  <div key={f.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">{f.originAirport}</span>
                                        <Plane className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm font-semibold">{f.destinationAirport}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        <div>{f.airline} · {f.flightNumber}</div>
                                        <div>{format(new Date(f.departureDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {f.seat && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">Assento {f.seat}</span>}
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.status === "confirmada" ? "bg-green-100 text-green-700" : f.status === "cancelada" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                                        {f.status === "confirmada" ? "Confirmada" : f.status === "cancelada" ? "Cancelada" : "Pendente"}
                                      </span>
                                      {f.voucherUrl && <a href={f.voucherUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><FileCheck className="h-3 w-3" /> Voucher</a>}
                                      <FileUpload category="passagem" refId={f.id} label="Anexar voucher" accept=".pdf,.jpg,.jpeg,.png" onUploaded={(doc) => { updateFlightVoucher.mutate({ id: f.id, voucherUrl: doc.fileUrl }); }} />
                                      <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover passagem?" description={`Remover passagem ${f.airline} ${f.flightNumber}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteFlight.mutate({ id: f.id })} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Hotels section */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold flex items-center gap-1.5"><Hotel className="h-4 w-4 text-teal-600" /> Hospedagem</h4>
                              <Button size="sm" variant="outline" onClick={() => { setHotelForTrip(t.id); setHotelDialogOpen(true); }} className="h-7 gap-1 text-xs">
                                <Plus className="h-3 w-3" /> Adicionar Hotel
                              </Button>
                            </div>
                            {tripHotels.length === 0 ? (
                              <p className="text-xs text-muted-foreground/60 py-2">Nenhuma reserva de hotel</p>
                            ) : (
                              <div className="space-y-2">
                                {tripHotels.map(h => (
                                  <div key={h.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Hotel className="h-4 w-4 text-teal-600" />
                                      <div>
                                        <div className="text-sm font-medium">{h.hotelName}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {h.city} · {format(new Date(h.checkIn), "dd/MM", { locale: ptBR })} → {format(new Date(h.checkOut), "dd/MM", { locale: ptBR })}
                                          {h.confirmationNumber && ` · Conf: ${h.confirmationNumber}`}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">R$ {Number(h.value).toFixed(2)}</span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${h.status === "confirmada" ? "bg-green-100 text-green-700" : h.status === "cancelada" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                                        {h.status === "confirmada" ? "Confirmada" : h.status === "cancelada" ? "Cancelada" : "Pendente"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Visit info + Waze */}
                          {visit && (
                            <div className="bg-white rounded-lg border p-3">
                              <h4 className="text-sm font-semibold mb-1">Visita Associada</h4>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div><span className="font-medium text-foreground">{visit.clientName}</span></div>
                                <div>{visit.address}, {visit.city}{visit.state ? ` - ${visit.state}` : ""}</div>
                                <div className="pt-1">
                                  <WazeLink address={visit.address} city={visit.city} label="Abrir no Waze" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Checklist do Veículo e Ferramentas */}
                          <div className="bg-white rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4 text-blue-600" /> Checklist do Veículo e Ferramentas</h4>
                              {(() => {
                                const cl = getTripChecklist(t.id);
                                if (!cl) {
                                  return <Button size="sm" variant="outline" onClick={() => initChecklist(t.id)} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Iniciar Checklist</Button>;
                                }
                                const items = parseChecklistItems(cl.items);
                                const done = items.filter(Boolean).length;
                                const total = vehicleChecklistItems.length;
                                return <span className={`text-[10px] px-2 py-0.5 rounded-full ${done === total ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{done}/{total} concluído</span>;
                              })()}
                            </div>
                            {(() => {
                              const cl = getTripChecklist(t.id);
                              if (!cl) {
                                return <p className="text-xs text-muted-foreground/60 py-2">Clique em "Iniciar Checklist" para verificar o veículo e ferramentas antes da viagem.</p>;
                              }
                              const items = parseChecklistItems(cl.items);
                              return (
                                <div className="space-y-1.5">
                                  {vehicleChecklistItems.map((label, idx) => (
                                    <div key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1 transition-colors" onClick={() => toggleChecklistItem(t.id, idx)}>
                                      {items[idx] ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                                      <span className={`text-xs ${items[idx] ? "text-foreground line-through" : "text-muted-foreground"}`}>{label}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          {t.notes && (
                            <div className="bg-white rounded-lg border p-3">
                              <h4 className="text-sm font-semibold mb-1">Observações</h4>
                              <p className="text-xs text-muted-foreground">{t.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          ))}
        </div>
        )}
        </>
      )

      {/* Trip Dialog */}
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
                  <SelectItem value="aviao">Avião</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Veículo / Info</Label><Input value={form.vehicleInfo} onChange={e => setForm(f => ({ ...f, vehicleInfo: e.target.value }))} placeholder="Modelo / Placa / Voo" /></div>
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

      {/* Hotel Dialog (inline from trip) */}
      <Dialog open={hotelDialogOpen} onOpenChange={o => { setHotelDialogOpen(o); if (!o) resetHotelForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Hotel className="h-5 w-5 text-teal-600" /> Adicionar Hospedagem</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><Label>Hotel *</Label><Input value={hotelForm.hotelName} onChange={e => setHotelForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Nome do hotel" /></div>
            <div><Label>Cidade *</Label><Input value={hotelForm.city} onChange={e => setHotelForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>Nº Confirmação</Label><Input value={hotelForm.confirmationNumber} onChange={e => setHotelForm(f => ({ ...f, confirmationNumber: e.target.value }))} /></div>
            <div><Label>Check-in *</Label><Input type="date" value={hotelForm.checkIn} onChange={e => setHotelForm(f => ({ ...f, checkIn: e.target.value }))} /></div>
            <div><Label>Check-out *</Label><Input type="date" value={hotelForm.checkOut} onChange={e => setHotelForm(f => ({ ...f, checkOut: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={hotelForm.value} onChange={e => setHotelForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={hotelForm.status} onValueChange={v => setHotelForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={hotelForm.observations} onChange={e => setHotelForm(f => ({ ...f, observations: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHotelDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleHotelSubmit} disabled={createHotel.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flight Dialog (inline from trip) */}
      <Dialog open={flightDialogOpen} onOpenChange={o => { setFlightDialogOpen(o); if (!o) resetFlightForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plane className="h-5 w-5 text-indigo-600" /> Adicionar Passagem de Avião</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><Label>Companhia Aérea *</Label><Input value={flightForm.airline} onChange={e => setFlightForm(f => ({ ...f, airline: e.target.value }))} placeholder="LATAM, Gol, Azul..." /></div>
            <div><Label>Número do Voo *</Label><Input value={flightForm.flightNumber} onChange={e => setFlightForm(f => ({ ...f, flightNumber: e.target.value }))} placeholder="LA1234" /></div>
            <div><Label>Aeroporto Origem *</Label><Input value={flightForm.originAirport} onChange={e => setFlightForm(f => ({ ...f, originAirport: e.target.value.toUpperCase() }))} placeholder="GRU" maxLength={5} /></div>
            <div><Label>Aeroporto Destino *</Label><Input value={flightForm.destinationAirport} onChange={e => setFlightForm(f => ({ ...f, destinationAirport: e.target.value.toUpperCase() }))} placeholder="BSB" maxLength={5} /></div>
            <div><Label>Cidade Origem</Label><Input value={flightForm.originCity} onChange={e => setFlightForm(f => ({ ...f, originCity: e.target.value }))} placeholder="São Paulo" /></div>
            <div><Label>Cidade Destino</Label><Input value={flightForm.destinationCity} onChange={e => setFlightForm(f => ({ ...f, destinationCity: e.target.value }))} placeholder="Brasília" /></div>
            <div><Label>Data/Hora Partida *</Label><Input type="datetime-local" value={flightForm.departureDateTime} onChange={e => setFlightForm(f => ({ ...f, departureDateTime: e.target.value }))} /></div>
            <div><Label>Data/Hora Chegada</Label><Input type="datetime-local" value={flightForm.arrivalDateTime} onChange={e => setFlightForm(f => ({ ...f, arrivalDateTime: e.target.value }))} /></div>
            <div><Label>Assento</Label><Input value={flightForm.seat} onChange={e => setFlightForm(f => ({ ...f, seat: e.target.value }))} placeholder="12A" /></div>
            <div><Label>Portão</Label><Input value={flightForm.gate} onChange={e => setFlightForm(f => ({ ...f, gate: e.target.value }))} placeholder="B3" /></div>
            <div><Label>Código de Reserva</Label><Input value={flightForm.bookingCode} onChange={e => setFlightForm(f => ({ ...f, bookingCode: e.target.value }))} placeholder="ABC123" /></div>
            <div><Label>Passageiro</Label><Input value={flightForm.passengerName} onChange={e => setFlightForm(f => ({ ...f, passengerName: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={flightForm.value} onChange={e => setFlightForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={flightForm.status} onValueChange={v => setFlightForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={flightForm.notes} onChange={e => setFlightForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="col-span-2">
              <Label>Voucher do Voo (Passagem)</Label>
              <FileUpload category="passagem" label="Anexar voucher da passagem aérea" accept=".pdf,.jpg,.jpeg,.png" onUploaded={(doc) => setFlightForm(f => ({ ...f, voucherUrl: doc.fileUrl }))} />
              {flightForm.voucherUrl && (
                <div className="flex items-center gap-2 mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <a href={flightForm.voucherUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 hover:underline truncate flex-1">Voucher anexado</a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFlightForm(f => ({ ...f, voucherUrl: "" }))} className="text-xs text-destructive">Remover</Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlightDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleFlightSubmit} disabled={createFlight.isPending}>Adicionar Passagem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
