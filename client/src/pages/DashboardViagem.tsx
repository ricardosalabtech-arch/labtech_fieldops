import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Hotel, Building2, Car, Clock, ChevronDown, ChevronUp, Calendar, Wrench, ClipboardCheck, CheckCircle2, Circle, Plus, CloudRain, Fuel, DollarSign, Coffee, Plane, Route as RouteIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PainelViagem from "@/components/PainelViagem";
import WeatherWidget from "@/components/WeatherWidget";
import WazeLink from "@/components/WazeLink";
import ConfirmDialog from "@/components/ConfirmDialog";

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

export default function DashboardViagem() {
  const { user } = useAuth();
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);

  const { data: trips, isLoading: tripsLoading } = trpc.trips.list.useQuery();
  const { data: visits } = trpc.visits.list.useQuery();
  const { data: hotels } = trpc.hotelReservations.list.useQuery();
  const { data: flights } = trpc.flightBookings.list.useQuery();
  const { data: expenses } = trpc.expenses.list.useQuery();
  const { data: checklists } = trpc.checklists.list.useQuery();

  const createChecklist = trpc.checklists.create.useMutation();
  const updateChecklist = trpc.checklists.update.useMutation();

  // Filtrar viagens do usuário atual (não-admin vê apenas as suas)
  const myTrips = useMemo(() => {
    if (!trips) return [];
    // Para equipe, mostrar apenas suas viagens; se não houver employeeName matching, mostrar todas
    return trips.filter(t => {
      // Se o usuário for técnico/especialista, filtra por nome
      if (user?.role === "tecnico" || user?.role === "especialista") {
        return t.employeeName === user?.name;
      }
      return true;
    });
  }, [trips, user]);

  // Viagens ativas (em andamento ou planejadas)
  const activeTrips = useMemo(() => {
    return myTrips.filter(t => t.status === "em_andamento" || t.status === "planejada")
      .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
  }, [myTrips]);

  const getTripVisit = (visitId: number) => visits?.find(v => v.id === visitId);
  const getTripHotels = (tripId: number) => hotels?.filter(h => h.tripId === tripId) || [];
  const getTripFlights = (tripId: number) => flights?.filter(f => f.tripId === tripId) || [];
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

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    planejada: { label: "Planejada", color: "text-blue-700", bg: "bg-blue-100" },
    em_andamento: { label: "Em Andamento", color: "text-amber-700", bg: "bg-amber-100" },
    concluida: { label: "Concluída", color: "text-green-700", bg: "bg-green-100" },
    cancelada: { label: "Cancelada", color: "text-red-700", bg: "bg-red-100" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel de Viagem</h1>
          <p className="text-sm text-muted-foreground">Suas viagens ativas com rotas, navegação e checklists</p>
        </div>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Viagens Ativas</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeTrips.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total de Viagens</p>
            <p className="text-2xl font-bold text-foreground mt-1">{myTrips.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold text-foreground mt-1">{myTrips.filter(t => t.status === "concluida").length}</p>
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

      {/* Lista de viagens ativas com Painel de Viagem */}
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
            const tripExpenses = expenses?.filter(e => e.tripId === t.id) || [];
            const destCity = visit?.city || t.returnAddress || "";
            const cl = getTripChecklist(t.id);
            const allItems = [...vehicleChecklistItems, ...toolChecklistItems];

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
                      {/* Direção para o Cliente */}
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

                      {/* Direção para o Hotel */}
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
                            parseChecklistItems(cl.items).filter(Boolean).length === allItems.length
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
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
                          {/* Checklist do Veículo */}
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

                          {/* Checklist de Ferramentas */}
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
    </div>
  );
}
