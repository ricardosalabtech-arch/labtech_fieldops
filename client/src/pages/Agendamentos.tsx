import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock, User, Bell, FileCheck, Paperclip, ListChecks, Wrench, Plus, Trash2, Car, Plane, Hotel, Navigation, ChevronDown, ClipboardCheck, CheckCircle2, Circle, Pencil } from "lucide-react";
import TransportBadge from "@/components/TransportBadge";
import PainelViagem from "@/components/PainelViagem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { Checkbox } from "@/components/ui/checkbox";
import WazeLink from "@/components/WazeLink";
import WeatherWidget from "@/components/WeatherWidget";
import FileUpload from "@/components/FileUpload";
import GeoLocation from "@/components/GeoLocation";
import { useAuth } from "@/_core/hooks/useAuth";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addMonths, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig = {
  agendado: { label: "Agendado", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  em_andamento: { label: "Em Andamento", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};

export default function Agendamentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "kanban">("month");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("visita");
  const [tripPeriod, setTripPeriod] = useState<string>("all");
  // Estados de viagem
  const [tripDialogOpen, setTripDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);
  const [hotelForTrip, setHotelForTrip] = useState<number | null>(null);
  const [flightDialogOpen, setFlightDialogOpen] = useState(false);
  const [flightForTrip, setFlightForTrip] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const { data: linkedDocs } = trpc.documents.list.useQuery(
    { category: "visita", refId: editingVisit?.id },
    { enabled: !!editingVisit?.id }
  );
  const { data: visitChecklists } = trpc.checklists.list.useQuery(
    { visitId: editingVisit?.id },
    { enabled: !!editingVisit?.id }
  );
  const { data: visitEquipments } = trpc.visitEquipment.list.useQuery(
    { visitId: editingVisit?.id },
    { enabled: !!editingVisit?.id }
  );
  const createChecklist = trpc.checklists.create.useMutation({ onSuccess: () => utils.checklists.invalidate() });
  const updateChecklistItem = trpc.checklists.update.useMutation({ onSuccess: () => utils.checklists.invalidate() });
  const deleteChecklist = trpc.checklists.delete.useMutation({ onSuccess: () => utils.checklists.invalidate() });
  const createEquipment = trpc.visitEquipment.create.useMutation({ onSuccess: () => utils.visitEquipment.invalidate() });
  const updateEquipment = trpc.visitEquipment.update.useMutation({ onSuccess: () => utils.visitEquipment.invalidate() });
  const deleteEquipment = trpc.visitEquipment.delete.useMutation({ onSuccess: () => utils.visitEquipment.invalidate() });
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newEquipTag, setNewEquipTag] = useState("");
  const [newEquipSerial, setNewEquipSerial] = useState("");
  const [newEquipQty, setNewEquipQty] = useState(1);

  const handleAddChecklist = () => {
    if (!editingVisit || !newChecklistTitle.trim()) return;
    createChecklist.mutate({
      visitId: editingVisit.id,
      title: newChecklistTitle,
      items: JSON.stringify([{ label: "Item 1", checked: false }]),
    });
    setNewChecklistTitle("");
    toast.success("Checklist criado");
  };

  const handleToggleChecklistItem = (checklistId: number, items: string, idx: number) => {
    const parsed = JSON.parse(items) as { label: string; checked: boolean }[];
    parsed[idx].checked = !parsed[idx].checked;
    updateChecklistItem.mutate({ id: checklistId, items: JSON.stringify(parsed) });
  };

  const handleAddEquipment = () => {
    if (!editingVisit || (!newEquipTag.trim() && !newEquipSerial.trim())) return;
    createEquipment.mutate({
      visitId: editingVisit.id,
      tag: newEquipTag || undefined,
      serialNumber: newEquipSerial || undefined,
      quantity: newEquipQty,
      status: "levado",
    });
    setNewEquipTag("");
    setNewEquipSerial("");
    setNewEquipQty(1);
    toast.success("Equipamento adicionado");
  };

  const utils = trpc.useUtils();
  const { data: visits, isLoading: visitsLoading } = trpc.visits.list.useQuery({
    status: filterStatus !== "all" ? filterStatus : undefined,
  });
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: trips } = trpc.trips.list.useQuery();
  const { data: hotelReservations } = trpc.hotelReservations.list.useQuery();
  const { data: flights } = trpc.flightBookings.list.useQuery();
  const { data: vehicleChecklists } = trpc.checklists.list.useQuery();
  const { data: tripExpenses } = trpc.expenses.list.useQuery();

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); toast.success("Viagem criada!"); setTripDialogOpen(false); resetTripForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateTrip = trpc.trips.update.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); toast.success("Viagem atualizada!"); setTripDialogOpen(false); resetTripForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteTrip = trpc.trips.delete.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); toast.success("Viagem removida"); },
  });
  const createHotel = trpc.hotelReservations.create.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva adicionada!"); setHotelDialogOpen(false); resetHotelForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const createFlight = trpc.flightBookings.create.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Passagem adicionada!"); setFlightDialogOpen(false); resetFlightForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteFlight = trpc.flightBookings.delete.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Passagem removida"); },
  });
  const updateFlightVoucher = trpc.flightBookings.update.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Voucher anexado!"); },
  });
  const createVehicleChecklist = trpc.checklists.create.useMutation({
    onSuccess: () => { utils.checklists.invalidate(); toast.success("Checklist salvo!"); },
  });
  const updateVehicleChecklist = trpc.checklists.update.useMutation({
    onSuccess: () => { utils.checklists.invalidate(); },
  });

  const createVisit = trpc.visits.create.useMutation({
    onSuccess: () => { utils.visits.list.invalidate(); toast.success("Visita agendada com sucesso!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro ao agendar visita: " + e.message),
  });
  const updateVisit = trpc.visits.update.useMutation({
    onSuccess: () => { utils.visits.list.invalidate(); toast.success("Visita atualizada!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message),
  });
  const saveGeo = trpc.visits.saveGeo.useMutation({
    onSuccess: () => toast.success("Localização registrada com sucesso!"),
    onError: (e) => toast.error("Erro ao registrar localização: " + e.message),
  });

  const [form, setForm] = useState({
    clientName: "", clientId: "", address: "", city: "", state: "",
    visitDate: "", endDate: "", scheduledTime: "", visitType: "manutencao_preventiva",
    employeeId: "", employeeName: "", tripId: "",
    transportMode: "carro_empresa", description: "", notes: "",
    notifyClient: false, notifySpecialist: false, notifyTechnician: false,
  });

  function resetForm() {
    setForm({ clientName: "", clientId: "", address: "", city: "", state: "", visitDate: "", endDate: "", scheduledTime: "", visitType: "manutencao_preventiva", employeeId: "", employeeName: "", tripId: "", transportMode: "carro_empresa", description: "", notes: "", notifyClient: false, notifySpecialist: false, notifyTechnician: false });
    setEditingVisit(null);
    setSelectedDate(null);
  }

  // ===== FORMS DE VIAGEM =====
  const [tripForm, setTripForm] = useState({ visitId: "", employeeId: "", employeeName: "", transportMode: "carro_empresa", vehicleInfo: "", departureDate: "", returnDate: "", returnAddress: "", status: "planejada", notes: "" });
  const [hotelForm, setHotelForm] = useState({ hotelName: "", city: "", checkIn: "", checkOut: "", confirmationNumber: "", value: "0.00", observations: "", status: "pendente" });
  const [flightForm, setFlightForm] = useState({ airline: "", flightNumber: "", originAirport: "", destinationAirport: "", originCity: "", destinationCity: "", departureDateTime: "", arrivalDateTime: "", seat: "", gate: "", bookingCode: "", passengerName: "", value: "0.00", status: "pendente", notes: "", voucherUrl: "" });

  function resetTripForm() { setTripForm({ visitId: "", employeeId: "", employeeName: "", transportMode: "carro_empresa", vehicleInfo: "", departureDate: "", returnDate: "", returnAddress: "", status: "planejada", notes: "" }); setEditingTrip(null); }
  function resetHotelForm() { setHotelForm({ hotelName: "", city: "", checkIn: "", checkOut: "", confirmationNumber: "", value: "0.00", observations: "", status: "pendente" }); setHotelForTrip(null); }
  function resetFlightForm() { setFlightForm({ airline: "", flightNumber: "", originAirport: "", destinationAirport: "", originCity: "", destinationCity: "", departureDateTime: "", arrivalDateTime: "", seat: "", gate: "", bookingCode: "", passengerName: "", value: "0.00", status: "pendente", notes: "", voucherUrl: "" }); setFlightForTrip(null); }

  function openNewTrip() { resetTripForm(); setTripDialogOpen(true); }
  function openEditTrip(t: any) {
    setEditingTrip(t);
    setTripForm({ visitId: t.visitId?.toString() || "", employeeId: t.employeeId?.toString() || "", employeeName: t.employeeName || "", transportMode: t.transportMode || "carro_empresa", vehicleInfo: t.vehicleInfo || "", departureDate: t.departureDate ? format(new Date(t.departureDate), "yyyy-MM-dd") : "", returnDate: t.returnDate ? format(new Date(t.returnDate), "yyyy-MM-dd") : "", returnAddress: t.returnAddress || "", status: t.status || "planejada", notes: t.notes || "" });
    setTripDialogOpen(true);
  }
  function handleTripSubmit() {
    if (!tripForm.departureDate) { toast.error("Data de saída é obrigatória"); return; }
    const data: any = { visitId: tripForm.visitId ? parseInt(tripForm.visitId) : undefined, employeeId: tripForm.employeeId ? parseInt(tripForm.employeeId) : undefined, employeeName: tripForm.employeeName || undefined, transportMode: tripForm.transportMode, vehicleInfo: tripForm.vehicleInfo || undefined, departureDate: new Date(tripForm.departureDate + "T00:00:00").getTime(), returnDate: tripForm.returnDate ? new Date(tripForm.returnDate + "T00:00:00").getTime() : undefined, returnAddress: tripForm.returnAddress || undefined, status: tripForm.status, notes: tripForm.notes || undefined };
    if (editingTrip) updateTrip.mutate({ id: editingTrip.id, ...data });
    else createTrip.mutate(data);
  }
  function handleHotelSubmit() {
    if (!hotelForm.hotelName || !hotelForm.city || !hotelForm.checkIn || !hotelForm.checkOut) { toast.error("Preencha hotel, cidade, check-in e check-out"); return; }
    createHotel.mutate({ tripId: hotelForTrip || undefined, hotelName: hotelForm.hotelName, city: hotelForm.city, checkIn: new Date(hotelForm.checkIn + "T14:00:00").getTime(), checkOut: new Date(hotelForm.checkOut + "T12:00:00").getTime(), confirmationNumber: hotelForm.confirmationNumber || undefined, value: hotelForm.value || "0.00", observations: hotelForm.observations || undefined, status: hotelForm.status as any });
  }
  function handleFlightSubmit() {
    if (!flightForm.airline || !flightForm.flightNumber || !flightForm.originAirport || !flightForm.destinationAirport || !flightForm.departureDateTime) { toast.error("Preencha companhia, voo, aeroportos e data de partida"); return; }
    createFlight.mutate({ tripId: flightForTrip || undefined, airline: flightForm.airline, flightNumber: flightForm.flightNumber, originAirport: flightForm.originAirport, destinationAirport: flightForm.destinationAirport, originCity: flightForm.originCity || undefined, destinationCity: flightForm.destinationCity || undefined, departureDateTime: new Date(flightForm.departureDateTime).getTime(), arrivalDateTime: flightForm.arrivalDateTime ? new Date(flightForm.arrivalDateTime).getTime() : undefined, seat: flightForm.seat || undefined, gate: flightForm.gate || undefined, bookingCode: flightForm.bookingCode || undefined, passengerName: flightForm.passengerName || undefined, value: flightForm.value || "0.00", status: flightForm.status as any, notes: flightForm.notes || undefined, voucherUrl: flightForm.voucherUrl || undefined });
  }

  const vehicleChecklistItems = ["Abastecimento completo", "Óleo e água verificados", "Pneus calibrados (incluindo estepe)", "Documentos do veículo (CRLV)", "Extintor e macaco", "Cintos de segurança", "Ferramentas de calibração", "Multímetro / Instrumentos", "Padrões de calibração", "EPIs (luvas, óculos, calçado)"];
  const getTripHotels = (tripId: number) => hotelReservations?.filter((h: any) => h.tripId === tripId) || [];
  const getTripFlights = (tripId: number) => flights?.filter((f: any) => f.tripId === tripId) || [];
  const getTripVisit = (visitId: number | null) => visits?.find((v: any) => v.id === visitId);
  const getTripVehicleChecklist = (tripId: number) => { const t = trips?.find((t: any) => t.id === tripId); if (!t?.visitId) return null; return vehicleChecklists?.find((c: any) => c.visitId === t.visitId && c.title === "Checklist do Veículo e Ferramentas") || null; };
  const parseVehicleItems = (s: string): boolean[] => { try { return JSON.parse(s); } catch { return []; } };
  function initVehicleChecklist(tripId: number) { const t = trips?.find((t: any) => t.id === tripId); if (!t?.visitId) { toast.error("Esta viagem não tem visita associada"); return; } if (getTripVehicleChecklist(tripId)) return; createVehicleChecklist.mutate({ visitId: t.visitId, title: "Checklist do Veículo e Ferramentas", items: JSON.stringify(vehicleChecklistItems.map(() => false)) }); }
  function toggleVehicleItem(tripId: number, idx: number) { const cl = getTripVehicleChecklist(tripId); if (!cl) return; const items = parseVehicleItems(cl.items); items[idx] = !items[idx]; updateVehicleChecklist.mutate({ id: cl.id, items: JSON.stringify(items) }); }

  const tripStatusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    planejada: { label: "Planejada", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
    em_andamento: { label: "Em Andamento", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
    concluida: { label: "Concluída", color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
    cancelada: { label: "Cancelada", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
  };

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
      endDate: visit.endDate ? format(new Date(visit.endDate), "yyyy-MM-dd") : "",
      scheduledTime: visit.scheduledTime || "",
      visitType: visit.visitType || "manutencao_preventiva",
      employeeId: visit.employeeId?.toString() || "",
      employeeName: visit.employeeName || "",
      tripId: visit.tripId?.toString() || "",
      transportMode: visit.transportMode || "carro_empresa",
      description: visit.description || "",
      notes: visit.notes || "",
      notifyClient: !!visit.clientNotified,
      notifySpecialist: !!visit.specialistNotified,
      notifyTechnician: !!visit.technicianNotified,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.clientName?.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    if (!form.address?.trim()) {
      toast.error("Endereço da visita é obrigatório");
      return;
    }
    if (!form.city?.trim()) {
      toast.error("Cidade é obrigatória");
      return;
    }
    if (!form.visitDate) {
      toast.error("Data da visita é obrigatória");
      return;
    }
    const data: any = {
      clientName: form.clientName,
      clientId: form.clientId ? parseInt(form.clientId) : undefined,
      address: form.address,
      city: form.city,
      state: form.state || undefined,
      visitDate: new Date(form.visitDate + "T00:00:00").getTime(),
      endDate: form.endDate ? new Date(form.endDate + "T23:59:59").getTime() : undefined,
      scheduledTime: form.scheduledTime || undefined,
      visitType: form.visitType,
      employeeId: form.employeeId ? parseInt(form.employeeId) : undefined,
      employeeName: form.employeeName || undefined,
      tripId: form.tripId ? parseInt(form.tripId) : undefined,
      transportMode: form.transportMode,
      description: form.description || undefined,
      notes: form.notes || undefined,
      clientNotified: form.notifyClient ? 1 : 0,
      specialistNotified: form.notifySpecialist ? 1 : 0,
      technicianNotified: form.notifyTechnician ? 1 : 0,
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

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter(t => {
      if (tripPeriod === "today") return isSameDay(new Date(t.departureDate), new Date());
      if (tripPeriod === "week") {
        const ws = startOfWeek(new Date(), { weekStartsOn: 0 });
        const we = endOfWeek(new Date(), { weekStartsOn: 0 });
        const td = new Date(t.departureDate);
        return td >= ws && td <= we;
      }
      if (tripPeriod === "month") return isSameMonth(new Date(t.departureDate), new Date());
      return true;
    });
  }, [trips, tripPeriod]);

  const tripPeriodFilters = [
    { label: "Todos os períodos", value: "all" },
    { label: "Hoje", value: "today" },
    { label: "Esta semana", value: "week" },
    { label: "Este mês", value: "month" },
  ];

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
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === "visita" ? `${filteredVisits.length} visita(s)` : `${filteredTrips.length} viagem(s)`}
          </p>
        </div>
        {isAdmin && activeTab === "visita" && (
          <Button onClick={() => openNewVisit()} className="gap-2 rounded-lg">
            <Plus className="h-4 w-4" /> Nova Visita
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visita">Visita</TabsTrigger>
          <TabsTrigger value="viagem">Viagem</TabsTrigger>
        </TabsList>

        {/* ===== ABA VISITA ===== */}
        <TabsContent value="visita" className="space-y-4">
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
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1 text-sm rounded-md transition-all ${view === "kanban" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"}`}
          >Kanban</button>
        </div>
      </div>

      {/* Calendar / Kanban */}
      {visitsLoading ? (
        <LoadingSkeleton count={3} type="card" />
      ) : filteredVisits.length === 0 && !visits?.length ? (
        <EmptyState
          icon={CalendarIcon}
          title="Nenhuma visita encontrada"
          description="Agende a primeira visita técnica para visualizá-la aqui."
          action={isAdmin ? <Button onClick={() => openNewVisit()} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Agendar primeira visita</Button> : undefined}
        />
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(statusConfig).map(([key, sc]) => {
            const colVisits = filteredVisits.filter(v => v.status === key);
            return (
              <div key={key} className="rounded-xl bg-muted/30 p-3 min-h-[300px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                    <span className="text-sm font-semibold">{sc.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{colVisits.length}</span>
                </div>
                <div className="space-y-2">
                  {colVisits.map(v => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-lg bg-card border ${sc.color} cursor-pointer hover:shadow-md transition-shadow`}
                      onClick={() => openEditVisit(v)}
                    >
                      <div className="font-medium text-sm truncate">{v.clientName}</div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{v.city}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />{format(new Date(v.visitDate), "dd/MM/yyyy")}
                      </div>
                      {v.scheduledTime && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{v.scheduledTime}
                        </div>
                      )}
                      {v.employeeName && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />{v.employeeName}
                        </div>
                      )}
                      {v.visitType && (
                        <div className="mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground capitalize">
                            {v.visitType.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {colVisits.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground/50">
                      Sem visitas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

        </TabsContent>

        {/* ===== ABA VIAGEM ===== */}
        <TabsContent value="viagem" className="space-y-4">
          {/* Header com botão Nova Viagem */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {tripPeriodFilters.map(f => (
                <button key={f.value} onClick={() => setTripPeriod(f.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    tripPeriod === f.value ? "bg-[oklch(0.48_0.18_250)] text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
                  }`}>{f.label}</button>
              ))}
            </div>
            {isAdmin && (
              <Button onClick={openNewTrip} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Nova Viagem</Button>
            )}
          </div>

          {filteredTrips.length === 0 ? (
            <EmptyState icon={Car} title="Nenhuma viagem encontrada" description="As viagens aparecerão aqui quando forem criadas." action={isAdmin ? <Button onClick={openNewTrip} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Criar primeira viagem</Button> : undefined} />
          ) : (
            <div className="space-y-4">
              {filteredTrips.map(t => {
                const tsc = tripStatusConfig[t.status as keyof typeof tripStatusConfig] || tripStatusConfig.planejada;
                const isExpanded = expandedTrip === t.id;
                const tripHotels = getTripHotels(t.id);
                const tripFlights = getTripFlights(t.id);
                const visit = t.visitId ? getTripVisit(t.visitId) : null;
                const destCity = visit?.city || t.returnAddress || "";
                return (
                  <Card key={t.id} className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpandedTrip(isExpanded ? null : t.id)}>
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
                              <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{format(new Date(t.departureDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                              {t.returnDate && <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Retorno: {format(new Date(t.returnDate), "dd/MM/yyyy", { locale: ptBR })}</span>}
                              {destCity && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{destCity}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <TransportBadge mode={t.transportMode} />
                          {visit && <WazeLink address={visit.address} city={visit.city} />}
                          {isAdmin && <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => openEditTrip(t)} className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>}
                          {isAdmin && <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-7 w-7 p-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>} title="Remover viagem?" description={`Remover a viagem de ${t.employeeName || "sem responsável"}?`} onConfirm={() => deleteTrip.mutate({ id: t.id })} />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t bg-slate-50/30 p-4 space-y-4">
                          <PainelViagem trip={t} visit={visit} hotels={tripHotels} flights={tripFlights} expenses={tripExpenses?.filter((e: any) => e.tripId === t.id) || []} />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {destCity && <div className="md:col-span-1"><WeatherWidget city={destCity} date={new Date(t.departureDate)} compact={false} /></div>}
                            <div className="md:col-span-2 space-y-3">
                              {/* Passagens */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><Plane className="h-4 w-4 text-indigo-600" /> Passagens de Avião</h4>
                                  <Button size="sm" variant="outline" onClick={() => { setFlightForTrip(t.id); setFlightDialogOpen(true); }} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar Voo</Button>
                                </div>
                                {tripFlights.length === 0 ? <p className="text-xs text-muted-foreground/60 py-2">Nenhum voo cadastrado</p> : (
                                  <div className="space-y-2">{tripFlights.map((f: any) => (
                                    <div key={f.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2"><span className="text-sm font-semibold">{f.originAirport}</span><Plane className="h-3 w-3 text-muted-foreground" /><span className="text-sm font-semibold">{f.destinationAirport}</span></div>
                                        <div className="text-xs text-muted-foreground"><div>{f.airline} · {f.flightNumber}</div><div>{format(new Date(f.departureDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div></div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {f.seat && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">Assento {f.seat}</span>}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.status === "confirmada" ? "bg-green-100 text-green-700" : f.status === "cancelada" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{f.status === "confirmada" ? "Confirmada" : f.status === "cancelada" ? "Cancelada" : "Pendente"}</span>
                                        {f.voucherUrl && <a href={f.voucherUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><FileCheck className="h-3 w-3" /> Voucher</a>}
                                        <FileUpload category="passagem" refId={f.id} label="Anexar voucher" accept=".pdf,.jpg,.jpeg,.png" onUploaded={(doc: any) => { updateFlightVoucher.mutate({ id: f.id, voucherUrl: doc.fileUrl }); }} />
                                        <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover passagem?" description={`Remover passagem ${f.airline} ${f.flightNumber}?`} onConfirm={() => deleteFlight.mutate({ id: f.id })} />
                                      </div>
                                    </div>
                                  ))}</div>
                                )}
                              </div>
                              {/* Hotel */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><Hotel className="h-4 w-4 text-teal-600" /> Hospedagem</h4>
                                  <Button size="sm" variant="outline" onClick={() => { setHotelForTrip(t.id); setHotelDialogOpen(true); }} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar Hotel</Button>
                                </div>
                                {tripHotels.length === 0 ? <p className="text-xs text-muted-foreground/60 py-2">Nenhuma reserva de hotel</p> : (
                                  <div className="space-y-2">{tripHotels.map((h: any) => (
                                    <div key={h.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3"><Hotel className="h-4 w-4 text-teal-600" /><div><div className="text-sm font-medium">{h.hotelName}</div><div className="text-xs text-muted-foreground">{h.city} · {format(new Date(h.checkIn), "dd/MM", { locale: ptBR })} → {format(new Date(h.checkOut), "dd/MM", { locale: ptBR })}{h.confirmationNumber && ` · Conf: ${h.confirmationNumber}`}</div></div></div>
                                      <div className="flex items-center gap-2"><span className="text-sm font-semibold">R$ {Number(h.value).toFixed(2)}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${h.status === "confirmada" ? "bg-green-100 text-green-700" : h.status === "cancelada" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{h.status === "confirmada" ? "Confirmada" : h.status === "cancelada" ? "Cancelada" : "Pendente"}</span></div>
                                    </div>
                                  ))}</div>
                                )}
                              </div>
                              {/* Visita associada */}
                              {visit && (
                                <div className="bg-white rounded-lg border p-3">
                                  <h4 className="text-sm font-semibold mb-1">Visita Associada</h4>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div><span className="font-medium text-foreground">{visit.clientName}</span></div>
                                    <div>{visit.address}, {visit.city}{visit.state ? ` - ${visit.state}` : ""}</div>
                                    <div className="pt-1"><WazeLink address={visit.address} city={visit.city} label="Abrir no Waze" /></div>
                                  </div>
                                </div>
                              )}
                              {/* Checklist (apenas equipe) */}
                              {!isAdmin && (
                                <div className="bg-white rounded-lg border p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4 text-blue-600" /> Checklist do Veículo e Ferramentas</h4>
                                    {(() => { const cl = getTripVehicleChecklist(t.id); if (!cl) return <Button size="sm" variant="outline" onClick={() => initVehicleChecklist(t.id)} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Iniciar</Button>; const items = parseVehicleItems(cl.items); const done = items.filter(Boolean).length; return <span className={`text-[10px] px-2 py-0.5 rounded-full ${done === vehicleChecklistItems.length ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{done}/{vehicleChecklistItems.length}</span>; })()}
                                  </div>
                                  {(() => { const cl = getTripVehicleChecklist(t.id); if (!cl) return <p className="text-xs text-muted-foreground/60 py-2">Clique em "Iniciar" para verificar o veículo antes da viagem.</p>; const items = parseVehicleItems(cl.items); return <div className="space-y-1.5">{vehicleChecklistItems.map((label, idx) => (<div key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1 transition-colors" onClick={() => toggleVehicleItem(t.id, idx)}>{items[idx] ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}<span className={`text-xs ${items[idx] ? "text-foreground line-through" : "text-muted-foreground"}`}>{label}</span></div>))}</div>; })()}
                                </div>
                              )}
                              {t.notes && <div className="bg-white rounded-lg border p-3"><h4 className="text-sm font-semibold mb-1">Observações</h4><p className="text-xs text-muted-foreground">{t.notes}</p></div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Nova/Editar Viagem */}
      <Dialog open={tripDialogOpen} onOpenChange={o => { setTripDialogOpen(o); if (!o) resetTripForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTrip ? "Editar Viagem" : "Nova Viagem"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><Label>Visita Associada</Label><Select value={tripForm.visitId} onValueChange={v => setTripForm(f => ({ ...f, visitId: v }))}><SelectTrigger><SelectValue placeholder="Selecione uma visita" /></SelectTrigger><SelectContent>{visits?.map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.clientName} — {format(new Date(v.visitDate), "dd/MM/yyyy")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Responsável</Label><Select value={tripForm.employeeId} onValueChange={v => { const emp = employees?.find((e: any) => e.id.toString() === v); setTripForm(f => ({ ...f, employeeId: v, employeeName: emp?.name || "" })); }}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{employees?.map((e: any) => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Meio de Transporte</Label><Select value={tripForm.transportMode} onValueChange={v => setTripForm(f => ({ ...f, transportMode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="carro_empresa">Carro da Empresa</SelectItem><SelectItem value="transporte_publico">Transporte Público</SelectItem><SelectItem value="app">Aplicativo</SelectItem><SelectItem value="aviao">Avião</SelectItem></SelectContent></Select></div>
            <div><Label>Veículo / Info</Label><Input value={tripForm.vehicleInfo} onChange={e => setTripForm(f => ({ ...f, vehicleInfo: e.target.value }))} placeholder="Modelo / Placa / Voo" /></div>
            <div><Label>Status</Label><Select value={tripForm.status} onValueChange={v => setTripForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planejada">Planejada</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="concluida">Concluída</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent></Select></div>
            <div><Label>Data de Saída *</Label><Input type="date" value={tripForm.departureDate} onChange={e => setTripForm(f => ({ ...f, departureDate: e.target.value }))} /></div>
            <div><Label>Data de Retorno</Label><Input type="date" value={tripForm.returnDate} onChange={e => setTripForm(f => ({ ...f, returnDate: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Endereço de Retorno</Label><Input value={tripForm.returnAddress} onChange={e => setTripForm(f => ({ ...f, returnAddress: e.target.value }))} placeholder="Endereço de retorno" /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={tripForm.notes} onChange={e => setTripForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTripDialogOpen(false)}>Cancelar</Button><Button onClick={handleTripSubmit} disabled={createTrip.isPending || updateTrip.isPending}>{editingTrip ? "Salvar" : "Criar Viagem"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hotel */}
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
            <div><Label>Status</Label><Select value={hotelForm.status} onValueChange={v => setHotelForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="confirmada">Confirmada</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent></Select></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={hotelForm.observations} onChange={e => setHotelForm(f => ({ ...f, observations: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setHotelDialogOpen(false)}>Cancelar</Button><Button onClick={handleHotelSubmit} disabled={createHotel.isPending}>Adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Passagem */}
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
            <div><Label>Status</Label><Select value={flightForm.status} onValueChange={v => setFlightForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="confirmada">Confirmada</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent></Select></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={flightForm.notes} onChange={e => setFlightForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="col-span-2">
              <Label>Voucher do Voo</Label>
              <FileUpload category="passagem" label="Anexar voucher da passagem" accept=".pdf,.jpg,.jpeg,.png" onUploaded={(doc: any) => setFlightForm(f => ({ ...f, voucherUrl: doc.fileUrl }))} />
              {flightForm.voucherUrl && (<div className="flex items-center gap-2 mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"><FileCheck className="h-4 w-4 text-green-600" /><a href={flightForm.voucherUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 hover:underline truncate flex-1">Voucher anexado</a><Button type="button" variant="ghost" size="sm" onClick={() => setFlightForm(f => ({ ...f, voucherUrl: "" }))} className="text-xs text-destructive">Remover</Button></div>)}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFlightDialogOpen(false)}>Cancelar</Button><Button onClick={handleFlightSubmit} disabled={createFlight.isPending}>Adicionar Passagem</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label>Data de Início *</Label>
              <Input type="date" value={form.visitDate} onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} />
            </div>
            <div>
              <Label>Data de Término</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <Label>Hora Agendada</Label>
              <Input type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo de Visita</Label>
              <Select value={form.visitType} onValueChange={v => setForm(f => ({ ...f, visitType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manutencao_preventiva">Manutenção Preventiva</SelectItem>
                  <SelectItem value="manutencao_corretiva">Manutenção Corretiva</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="col-span-2">
              <Label>Viagem Vinculada</Label>
              <Select value={form.tripId} onValueChange={v => setForm(f => ({ ...f, tripId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione uma viagem (opcional)" /></SelectTrigger>
                <SelectContent>
                  {trips?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.employeeName} — {format(new Date(t.departureDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.city && (
              <div className="col-span-2">
                <WeatherWidget city={form.city} date={form.visitDate ? new Date(form.visitDate) : undefined} compact={false} />
              </div>
            )}
            <div className="col-span-2">
              <Label className="flex items-center gap-2 mb-2"><Bell className="h-4 w-4" /> Notificar sobre a visita</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.notifyClient} onCheckedChange={(v) => setForm(f => ({ ...f, notifyClient: !!v }))} />
                  <span className="text-sm">Cliente</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.notifySpecialist} onCheckedChange={(v) => setForm(f => ({ ...f, notifySpecialist: !!v }))} />
                  <span className="text-sm">Especialista</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.notifyTechnician} onCheckedChange={(v) => setForm(f => ({ ...f, notifyTechnician: !!v }))} />
                  <span className="text-sm">Técnico</span>
                </label>
              </div>
            </div>
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
          {editingVisit && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Checklist da Visita</span>
              </div>
              <div className="flex gap-2 mb-2">
                <Input value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)} placeholder="Título do checklist (ex: Inspeção Preventiva)" className="flex-1" />
                <Button size="sm" variant="outline" onClick={handleAddChecklist} disabled={!newChecklistTitle.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
              {visitChecklists && visitChecklists.length > 0 ? (
                <div className="space-y-2">
                  {visitChecklists.map((cl: any) => {
                    const items = JSON.parse(cl.items) as { label: string; checked: boolean }[];
                    return (
                      <div key={cl.id} className="rounded-lg border p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cl.title}</span>
                          <ConfirmDialog
                            trigger={<Button size="sm" variant="ghost" aria-label="Excluir"><Trash2 className="h-3 w-3 text-red-500" /></Button>}
                            title="Remover Checklist"
                            description="Tem certeza que deseja remover este checklist?"
                            onConfirm={() => { deleteChecklist.mutate(cl.id); toast.success("Checklist removido"); }}
                          />
                        </div>
                        {items.map((item, idx) => (
                          <label key={idx} className="flex items-center gap-2 py-0.5 cursor-pointer">
                            <Checkbox checked={item.checked} onCheckedChange={() => handleToggleChecklistItem(cl.id, cl.items, idx)} />
                            <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum checklist criado. Adicione um título acima para começar.</p>
              )}
            </div>
          )}
          {editingVisit && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Equipamentos da Visita</span>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-2">
                <Input value={newEquipTag} onChange={e => setNewEquipTag(e.target.value)} placeholder="TAG" className="col-span-5" />
                <Input value={newEquipSerial} onChange={e => setNewEquipSerial(e.target.value)} placeholder="Nº Série" className="col-span-4" />
                <Input type="number" value={newEquipQty} onChange={e => setNewEquipQty(parseInt(e.target.value) || 1)} className="col-span-2" min={1} />
                <Button size="sm" variant="outline" className="col-span-1" onClick={handleAddEquipment} disabled={!newEquipTag.trim() && !newEquipSerial.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
              {visitEquipments && visitEquipments.length > 0 ? (
                <div className="space-y-1.5">
                  {visitEquipments.map((eq: any) => (
                    <div key={eq.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium flex-1">{eq.tag ? `TAG: ${eq.tag}` : ''}{eq.tag && eq.serialNumber ? ' · ' : ''}{eq.serialNumber ? `S/N: ${eq.serialNumber}` : ''}</span>
                      <span className="text-xs text-muted-foreground">Qtd: {eq.quantity}</span>
                      <Select value={eq.status} onValueChange={(v) => updateEquipment.mutate({ id: eq.id, status: v as any })}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="levado">Levado</SelectItem>
                          <SelectItem value="devolvido">Devolvido</SelectItem>
                          <SelectItem value="permaneceu">Permaneceu</SelectItem>
                        </SelectContent>
                      </Select>
                      <ConfirmDialog
                        trigger={<Button size="sm" variant="ghost" aria-label="Excluir"><Trash2 className="h-3 w-3 text-red-500" /></Button>}
                        title="Remover Equipamento"
                        description="Tem certeza que deseja remover este equipamento da visita?"
                        onConfirm={() => { deleteEquipment.mutate(eq.id); toast.success("Equipamento removido"); }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum equipamento registrado para esta visita.</p>
              )}
            </div>
          )}
          {editingVisit && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Documentos da Visita</span>
              </div>
              <FileUpload
                category="visita"
                refId={editingVisit.id}
                label="Anexar documento (manual, ordem de serviço, foto, etc.)"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onUploaded={() => toast.success("Documento anexado à visita")}
              />
              {linkedDocs && linkedDocs.length > 0 ? (
                <div className="space-y-1.5 mt-2">
                  {linkedDocs.map((d: any) => (
                    <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 hover:bg-green-100 transition-colors">
                      <FileCheck className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm text-green-700 truncate flex-1">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{d.mimeType}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Nenhum documento vinculado a esta visita ainda.</p>
              )}
            </div>
          )}
          {editingVisit && !isAdmin && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Registrar Presença no Local</span>
              </div>
              <GeoLocation
                label="Capturar minha localização"
                onLocationCapture={(lat, lng) => {
                  saveGeo.mutate({ id: editingVisit.id, latitude: lat.toString(), longitude: lng.toString() });
                }}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            {isAdmin && (
              <Button onClick={handleSubmit} disabled={createVisit.isPending || updateVisit.isPending}>
                {editingVisit ? "Salvar Alterações" : "Agendar Visita"}
              </Button>
            )}
            {!isAdmin && editingVisit && (
              <Button onClick={handleSubmit} disabled={createVisit.isPending || updateVisit.isPending}>
                Atualizar Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
