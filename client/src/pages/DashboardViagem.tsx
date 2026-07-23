import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/EmptyState";
import {
  Navigation, MapPin, Hotel, Building2, Car, Clock, ChevronDown, ChevronUp,
  Calendar, Wrench, ClipboardCheck, CheckCircle2, Circle, Plus, CloudRain,
  Fuel, DollarSign, Coffee, Plane, Route as RouteIcon, FileText, BedDouble,
  AlertTriangle, Bell, ClipboardList, Wallet, TrendingUp, Play, Flag,
  MapPinned, ClipboardPaste, FolderOpen, Settings,
} from "lucide-react";
import { format, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PainelViagem from "@/components/PainelViagem";
import WeatherWidget from "@/components/WeatherWidget";
import WazeLink from "@/components/WazeLink";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { useLocation } from "wouter";

const vehicleChecklistItems = [
  "Abastecimento completo",
  "Nível de óleo do motor",
  "Nível de água do radiador",
  "Calibragem dos pneus (incluindo estepe)",
  "Condicionamento do estepe",
  "Documentos do veículo (CRLV, seguro)",
  "Extintor de incêndio",
  "Triângulo de sinalização",
  "Macaco e chave de roda",
  "Cinto de segurança (todos)",
  "Faróis e lanternas funcionando",
  "Limpeza do veículo",
];

const toolChecklistItems = [
  "Kit de ferramentas de calibração",
  "Multímetro / instrumentos de medição",
  "Notebook / tablet de trabalho",
  "Cabos e adaptadores",
  "Manuais técnicos do equipamento",
  "EPIs (luvas, óculos, capacete, botas)",
  "Crachá de identificação",
  "Documentos da visita (ordem de serviço)",
  "Materiais de limpeza técnica",
  "Software / licenças atualizadas",
];

function parseChecklistItems(items: string): boolean[] {
  try {
    const parsed = JSON.parse(items);
    if (Array.isArray(parsed)) return parsed.map(v => v === true);
    return [];
  } catch {
    return [];
  }
}

const expenseCategoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  combustivel: { label: "Combustível", icon: Fuel, color: "text-orange-600" },
  pedagio: { label: "Pedágio", icon: RouteIcon, color: "text-purple-600" },
  alimentacao: { label: "Alimentação", icon: Coffee, color: "text-green-600" },
  transporte: { label: "Transporte", icon: Car, color: "text-blue-600" },
  hospedagem: { label: "Hospedagem", icon: BedDouble, color: "text-teal-600" },
  outros: { label: "Outros", icon: DollarSign, color: "text-gray-600" },
};

export default function DashboardViagem() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseTripId, setExpenseTripId] = useState<number | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: "combustivel" as "combustivel" | "pedagio" | "alimentacao" | "transporte" | "hospedagem" | "outros",
    description: "",
    amount: "",
  });

  const utils = trpc.useUtils();
  const { data: trips, isLoading: tripsLoading } = trpc.trips.list.useQuery();
  const { data: visits } = trpc.visits.list.useQuery();
  const { data: hotels } = trpc.hotelReservations.list.useQuery();
  const { data: flights } = trpc.flightBookings.list.useQuery();
  const { data: expenses } = trpc.expenses.list.useQuery();
  const { data: checklists } = trpc.checklists.list.useQuery();
  const { data: documents } = trpc.documents.list.useQuery({ category: "visita" });

  const createChecklist = trpc.checklists.create.useMutation({ onSuccess: () => utils.checklists.invalidate() });
  const updateChecklist = trpc.checklists.update.useMutation({ onSuccess: () => utils.checklists.invalidate() });
  const updateTripStatus = trpc.trips.updateStatus.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); toast.success("Status da viagem atualizado!"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateVisitStatus = trpc.visits.update.useMutation({
    onSuccess: () => { utils.visits.list.invalidate(); toast.success("Status da visita atualizado!"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      toast.success("Despesa registrada!");
      setExpenseDialogOpen(false);
      setExpenseForm({ category: "combustivel", description: "", amount: "" });
    },
    onError: (e) => toast.error("Erro ao registrar despesa: " + e.message),
  });

  // Filtrar viagens do usuário atual
  const myTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter(t => {
      if (user?.role === "tecnico" || user?.role === "especialista") {
        return t.employeeName === user?.name;
      }
      return true;
    });
  }, [trips, user]);

  // Viagens ativas
  const activeTrips = useMemo(() => {
    return myTrips
      .filter(t => t.status === "em_andamento" || t.status === "planejada")
      .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
  }, [myTrips]);

  // Minha agenda do dia (visitas de hoje)
  const todayVisits = useMemo(() => {
    if (!visits) return [];
    return visits.filter(v => {
      if (user?.role === "tecnico" || user?.role === "especialista") {
        return v.employeeName === user?.name && isToday(new Date(v.visitDate));
      }
      return isToday(new Date(v.visitDate));
    });
  }, [visits, user]);

  // Viagens de hoje
  const todayTrips = useMemo(() => {
    return activeTrips.filter(t => isToday(new Date(t.departureDate)));
  }, [activeTrips]);

  // Despesas pendentes de aprovação
  const pendingExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(e => {
      const isMine = user?.role !== "admin" ? e.employeeName === user?.name : true;
      return isMine && e.status === "pendente";
    });
  }, [expenses, user]);

  // Documentos disponíveis
  const availableDocs = useMemo(() => {
    if (!documents) return [];
    return documents.slice(0, 5);
  }, [documents]);

  const getTripVisit = (visitId: number) => visits?.find(v => v.id === visitId);
  const getTripHotels = (tripId: number) => hotels?.filter(h => h.tripId === tripId) || [];
  const getTripFlights = (tripId: number) => flights?.filter(f => f.tripId === tripId) || [];
  const getTripExpenses = (tripId: number) => expenses?.filter(e => e.tripId === tripId) || [];
  const getTripChecklist = (tripId: number) => {
    const trip = trips?.find(t => t.id === tripId);
    if (!trip?.visitId) return undefined;
    return checklists?.find(c => c.visitId === trip.visitId && c.title === "Checklist do Veículo e Ferramentas");
  };

  const initChecklist = (tripId: number) => {
    const trip = trips?.find(t => t.id === tripId);
    if (!trip?.visitId) return;
    const items = JSON.stringify(new Array(vehicleChecklistItems.length + toolChecklistItems.length).fill(false));
    createChecklist.mutate({ visitId: trip.visitId, title: "Checklist do Veículo e Ferramentas", items });
  };

  const toggleChecklistItem = (tripId: number, idx: number) => {
    const cl = getTripChecklist(tripId);
    if (!cl) return;
    const items = parseChecklistItems(cl.items);
    items[idx] = !items[idx];
    updateChecklist.mutate({ id: cl.id, items: JSON.stringify(items) });
  };

  const toggleExpand = (tripId: number) => {
    setExpandedTrip(expandedTrip === tripId ? null : tripId);
  };

  const handleStartTrip = (tripId: number) => {
    updateTripStatus.mutate({ id: tripId, status: "em_andamento" });
  };

  const handleFinishTrip = (tripId: number) => {
    updateTripStatus.mutate({ id: tripId, status: "concluida" });
  };

  const handleArriveAtClient = (visitId: number) => {
    updateVisitStatus.mutate({ id: visitId, status: "em_andamento" });
  };

  const handleFinishVisit = (visitId: number) => {
    updateVisitStatus.mutate({ id: visitId, status: "concluido" });
  };

  const handleOpenExpenseDialog = (tripId: number) => {
    setExpenseTripId(tripId);
    setExpenseForm({ category: "combustivel", description: "", amount: "" });
    setExpenseDialogOpen(true);
  };

  const handleSubmitExpense = () => {
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    const trip = trips?.find(t => t.id === expenseTripId);
    createExpense.mutate({
      tripId: expenseTripId || undefined,
      visitId: trip?.visitId || undefined,
      employeeId: trip?.employeeId || undefined,
      employeeName: trip?.employeeName || user?.name || undefined,
      category: expenseForm.category,
      description: expenseForm.description || undefined,
      amount: expenseForm.amount,
    });
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    planejada: { label: "Planejada", color: "text-blue-700", bg: "bg-blue-100" },
    em_andamento: { label: "Em Andamento", color: "text-amber-700", bg: "bg-amber-100" },
    concluida: { label: "Concluída", color: "text-green-700", bg: "bg-green-100" },
    cancelada: { label: "Cancelada", color: "text-red-700", bg: "bg-red-100" },
  };

  const totalTripExpenses = (tripId: number) => {
    const tripExpenses = getTripExpenses(tripId);
    return tripExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  };

  const quickLinks = [
    { icon: FolderOpen, label: "Documentos", path: "/documentos", color: "text-blue-600" },
    { icon: BedDouble, label: "Reservas", path: "/reservas", color: "text-teal-600" },
    { icon: Wallet, label: "Custos", path: "/custos", color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel de Viagem</h1>
          <p className="text-sm text-muted-foreground">Suas viagens, visitas e despesas em um só lugar</p>
        </div>
      </div>

      {/* 1. Minha Agenda do Dia */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Minha Agenda — {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {todayVisits.length === 0 && todayTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">Nenhuma visita ou viagem agendada para hoje.</p>
          ) : (
            <div className="space-y-2">
              {todayVisits.map(v => {
                const sc = statusConfig[v.status] || statusConfig.planejada;
                return (
                  <div key={v.id} className="flex items-center gap-3 bg-white rounded-lg border p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{v.clientName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{v.city}{v.scheduledTime ? ` · ${v.scheduledTime}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    <WazeLink address={v.address} city={v.city} />
                  </div>
                );
              })}
              {todayTrips.map(t => {
                const visit = t.visitId ? getTripVisit(t.visitId) : null;
                const sc = statusConfig[t.status] || statusConfig.planejada;
                return (
                  <div key={t.id} className="flex items-center gap-3 bg-white rounded-lg border p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <Car className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Viagem: {visit?.city || t.returnAddress || "Sem destino"}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.employeeName}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Cards de resumo rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Viagens Ativas</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeTrips.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Visitas Hoje</p>
            <p className="text-2xl font-bold text-foreground mt-1">{todayVisits.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Despesas Pendentes</p>
            <p className="text-2xl font-bold text-foreground mt-1">{pendingExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Checklists Pendentes</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {activeTrips.filter(t => !getTripChecklist(t.id)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Alertas e Notificações */}
      {(pendingExpenses.length > 0 || availableDocs.length > 0 || activeTrips.some(t => !getTripChecklist(t.id))) && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              Avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {activeTrips.filter(t => !getTripChecklist(t.id)).map(t => (
              <div key={`cl-${t.id}`} className="flex items-center gap-2 text-sm bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-amber-800 flex-1">Checklist pendente para viagem: {t.returnAddress || "Sem destino"}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { initChecklist(t.id); setExpandedTrip(t.id); }}>
                  Preencher
                </Button>
              </div>
            ))}
            {pendingExpenses.length > 0 && (
              <div className="flex items-center gap-2 text-sm bg-blue-50 rounded-lg px-3 py-2">
                <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-blue-800 flex-1">{pendingExpenses.length} despesa(s) aguardando aprovação do gestor</span>
              </div>
            )}
            {availableDocs.length > 0 && (
              <div className="flex items-center gap-2 text-sm bg-green-50 rounded-lg px-3 py-2">
                <FileText className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-green-800 flex-1">{availableDocs.length} documento(s) disponível(is) para suas visitas</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLocation("/documentos")}>
                  Ver
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Atalhos rápidos */}
      <div className="grid grid-cols-3 gap-3">
        {quickLinks.map(link => (
          <button
            key={link.path}
            onClick={() => setLocation(link.path)}
            className="flex flex-col items-center gap-1.5 bg-white border-0 shadow-sm rounded-xl p-3 hover:shadow-md transition-shadow"
          >
            <link.icon className={`h-5 w-5 ${link.color}`} />
            <span className="text-xs font-medium text-foreground">{link.label}</span>
          </button>
        ))}
      </div>

      {/* 5. Viagens ativas com ações rápidas e painel completo */}
      {tripsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-1/3 mb-3" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeTrips.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent>
            <EmptyState
              icon={Car}
              title="Nenhuma viagem ativa"
              description="Você não tem viagens em andamento ou planejadas no momento."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeTrips.map(t => {
            const sc = statusConfig[t.status] || statusConfig.planejada;
            const isExpanded = expandedTrip === t.id;
            const visit = t.visitId ? getTripVisit(t.visitId) : null;
            const tripHotels = getTripHotels(t.id);
            const tripFlights = getTripFlights(t.id);
            const tripExpenses = getTripExpenses(t.id);
            const destCity = visit?.city || t.returnAddress || "";
            const cl = getTripChecklist(t.id);
            const allItems = [...vehicleChecklistItems, ...toolChecklistItems];
            const totalExpenses = totalTripExpenses(t.id);
            const checklistComplete = cl && parseChecklistItems(cl.items).filter(Boolean).length === allItems.length;

            return (
              <Card key={t.id} className="border-0 shadow-sm overflow-hidden">
                {/* Header da viagem */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => toggleExpand(t.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Car className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {destCity || "Sem destino"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.employeeName} · {format(new Date(t.departureDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    {visit && <WazeLink address={visit.address} city={visit.city} />}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Botões de ação rápida (sempre visíveis para viagens ativas) */}
                <div className="px-4 pb-3 flex flex-wrap gap-2 border-b">
                  {t.status === "planejada" && (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700"
                      onClick={(e) => { e.stopPropagation(); handleStartTrip(t.id); }}
                      disabled={updateTripStatus.isPending}
                    >
                      <Play className="h-3.5 w-3.5" /> Iniciar Viagem
                    </Button>
                  )}
                  {t.status === "em_andamento" && visit && (
                    <>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => { e.stopPropagation(); handleArriveAtClient(visit.id); }}
                        disabled={updateVisitStatus.isPending}
                      >
                        <MapPinned className="h-3.5 w-3.5" /> Cheguei no Cliente
                      </Button>
                      {visit.status === "em_andamento" && (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
                          onClick={(e) => { e.stopPropagation(); handleFinishVisit(visit.id); }}
                          disabled={updateVisitStatus.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar Visita
                        </Button>
                      )}
                    </>
                  )}
                  {t.status === "em_andamento" && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-red-600 hover:bg-red-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Flag className="h-3.5 w-3.5" /> Finalizar Viagem
                        </Button>
                      }
                      title="Finalizar Viagem"
                      description="Confirma que a viagem foi concluída? O status será alterado para 'Concluída'."
                      onConfirm={() => handleFinishTrip(t.id)}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); handleOpenExpenseDialog(t.id); }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Despesa
                  </Button>
                  {cl && !checklistComplete && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" /> Checklist pendente
                    </span>
                  )}
                  {!cl && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" /> Checklist não iniciado
                    </span>
                  )}
                </div>

                {/* Resumo de custos da viagem */}
                {tripExpenses.length > 0 && (
                  <div className="px-4 py-2 bg-slate-50/50 border-b flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Custos da Viagem
                    </span>
                    {Object.entries(
                      tripExpenses.reduce((acc, e) => {
                        const cat = e.category;
                        if (!acc[cat]) acc[cat] = 0;
                        acc[cat] += parseFloat(e.amount || "0");
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([cat, val]) => {
                      const cfg = expenseCategoryConfig[cat] || expenseCategoryConfig.outros;
                      return (
                        <span key={cat} className={`text-xs ${cfg.color} flex items-center gap-1`}>
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}: R$ {val.toFixed(2)}
                        </span>
                      );
                    })}
                    <span className="text-xs font-bold text-foreground ml-auto">
                      Total: R$ {totalExpenses.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="border-t bg-slate-50/30 p-4 space-y-4">
                    {/* Painel da Viagem completo */}
                    <PainelViagem
                      trip={t}
                      visit={visit}
                      hotels={tripHotels}
                      flights={tripFlights}
                      expenses={tripExpenses}
                    />

                    {/* Botões de navegação rápida */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {visit && (
                        <div className="bg-white rounded-lg border p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <h4 className="text-sm font-semibold">Direção para o Cliente</h4>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1 mb-2">
                            <p className="font-medium text-foreground">{visit.clientName}</p>
                            <p>{visit.address}, {visit.city}{visit.state ? ` - ${visit.state}` : ""}</p>
                          </div>
                          <a
                            href={`https://www.waze.com/ul?q=${encodeURIComponent(`${visit.address}, ${visit.city}`)}&navigate=yes`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[oklch(0.48_0.18_250)] text-white text-xs font-medium hover:bg-[oklch(0.38_0.18_250)] transition-colors"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Navegar para o Cliente
                          </a>
                        </div>
                      )}

                      {tripHotels.length > 0 && (
                        <div className="bg-white rounded-lg border p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Hotel className="h-4 w-4 text-teal-600" />
                            <h4 className="text-sm font-semibold">Direção para o Hotel</h4>
                          </div>
                          {tripHotels.map(h => (
                            <div key={h.id} className="mb-2">
                              <p className="text-xs font-medium text-foreground">{h.hotelName}</p>
                              <p className="text-xs text-muted-foreground">{h.city}</p>
                              <a
                                href={`https://www.waze.com/ul?q=${encodeURIComponent(`${h.hotelName}, ${h.city}`)}&navigate=yes`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors mt-1"
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                Navegar para o Hotel
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Clima no destino */}
                    {destCity && (
                      <WeatherWidget city={destCity} date={new Date(t.departureDate)} compact={false} />
                    )}

                    {/* Checklist do Veículo e Ferramentas */}
                    <div className="bg-white rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <ClipboardCheck className="h-4 w-4 text-blue-600" />
                          Checklist do Veículo e Ferramentas
                        </h4>
                        {cl ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            checklistComplete ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {parseChecklistItems(cl.items).filter(Boolean).length}/{allItems.length} concluído
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => initChecklist(t.id)} className="h-7 gap-1 text-xs">
                            <Plus className="h-3 w-3" /> Iniciar Checklist
                          </Button>
                        )}
                      </div>

                      {cl ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5" /> Veículo
                            </h5>
                            <div className="space-y-1.5">
                              {vehicleChecklistItems.map((label, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1 transition-colors"
                                  onClick={() => toggleChecklistItem(t.id, idx)}
                                >
                                  {parseChecklistItems(cl.items)[idx] ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                  )}
                                  <span className={`text-xs ${
                                    parseChecklistItems(cl.items)[idx] ? "text-foreground line-through" : "text-muted-foreground"
                                  }`}>
                                    {label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Wrench className="h-3.5 w-3.5" /> Ferramentas de Manutenção
                            </h5>
                            <div className="space-y-1.5">
                              {toolChecklistItems.map((label, idx) => {
                                const realIdx = idx + vehicleChecklistItems.length;
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-md px-2 py-1 transition-colors"
                                    onClick={() => toggleChecklistItem(t.id, realIdx)}
                                  >
                                    {parseChecklistItems(cl.items)[realIdx] ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                    )}
                                    <span className={`text-xs ${
                                      parseChecklistItems(cl.items)[realIdx] ? "text-foreground line-through" : "text-muted-foreground"
                                    }`}>
                                      {label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 py-2">
                          Clique em "Iniciar Checklist" para verificar o veículo e ferramentas antes da viagem.
                        </p>
                      )}
                    </div>

                    {/* Observações */}
                    {t.notes && (
                      <div className="bg-white rounded-lg border p-3">
                        <h4 className="text-sm font-semibold mb-1">Observações</h4>
                        <p className="text-xs text-muted-foreground">{t.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Histórico de viagens concluídas */}
      {myTrips.filter(t => t.status === "concluida").length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Viagens Concluídas</h3>
          <div className="space-y-2">
            {myTrips.filter(t => t.status === "concluida").slice(0, 5).map(t => {
              const visit = t.visitId ? getTripVisit(t.visitId) : null;
              const destCity = visit?.city || t.returnAddress || "—";
              return (
                <Card key={t.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{destCity}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(t.departureDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Concluída</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog de lançamento rápido de despesa */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-600" />
              Lançar Despesa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Categoria</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm(f => ({ ...f, category: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="combustivel">Combustível</SelectItem>
                  <SelectItem value="pedagio">Pedágio</SelectItem>
                  <SelectItem value="alimentacao">Alimentação</SelectItem>
                  <SelectItem value="transporte">Transporte</SelectItem>
                  <SelectItem value="hospedagem">Hospedagem</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={expenseForm.description}
                onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Abastecimento posto Shell"
                rows={2}
              />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitExpense} disabled={createExpense.isPending}>
              Registrar Despesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
