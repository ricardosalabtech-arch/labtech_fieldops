import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, DollarSign, Building2, BedDouble, Plus, ArrowRight, Plane } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import WazeLink from "@/components/WazeLink";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: visits } = trpc.visits.list.useQuery({ status: "agendado" });
  const { data: flights } = trpc.flightBookings.list.useQuery();
  const [, setLocation] = useLocation();

  const upcomingFlights = flights?.filter(f => new Date(f.departureDateTime) >= new Date() && f.status !== "cancelada").slice(0, 3) || [];

  const cards = [
    { label: "Visitas Hoje", value: stats?.visitsToday ?? 0, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Em Andamento", value: stats?.inProgress ?? 0, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Concluídas", value: stats?.completed ?? 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Custos Totais", value: `R$ ${(stats?.totalCosts ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Clientes", value: stats?.totalClients ?? 0, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Reservas Ativas", value: stats?.activeReservations ?? 0, icon: BedDouble, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Voos", value: upcomingFlights.length, icon: Plane, color: "text-sky-600", bg: "bg-sky-50" },
  ];

  const quickActions = [
    { label: "Nova Visita", path: "/agendamentos", icon: Plus },
    { label: "Nova Viagem", path: "/viagens", icon: Plus },
    { label: "Nova Reserva", path: "/reservas", icon: Plus },
    { label: "Ver Relatórios", path: "/relatorios", icon: ArrowRight },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {card.label}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[oklch(0.22_0.02_250)]">
                {isLoading ? "—" : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ações Rápidas */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                onClick={() => setLocation(action.path)}
                className="gap-2 rounded-lg"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Próximas Visitas */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Próximas Visitas</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/agendamentos")} className="text-primary">
            Ver todas <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {!visits || visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma visita agendada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.slice(0, 5).map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                  onClick={() => setLocation("/agendamentos")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{visit.clientName}</p>
                      <p className="text-xs text-muted-foreground">{visit.city} · {visit.address}</p>
                      <WazeLink address={visit.address} city={visit.city} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(visit.visitDate), "dd/MM/yyyy")}
                    </p>
                    {visit.scheduledTime && (
                      <p className="text-xs text-muted-foreground">{visit.scheduledTime}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos Voos */}
      {upcomingFlights.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Plane className="h-4 w-4 text-indigo-600" /> Próximos Voos</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/viagens")} className="text-primary">
              Ver viagens <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingFlights.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors cursor-pointer" onClick={() => setLocation("/viagens")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Plane className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{f.airline} · {f.flightNumber}</p>
                      <p className="text-xs text-muted-foreground">{f.originAirport} → {f.destinationAirport} · {format(new Date(f.departureDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.status === "confirmada" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {f.status === "confirmada" ? "Confirmada" : "Pendente"}
                    </span>
                    {f.seat && <p className="text-xs text-muted-foreground mt-1">Assento {f.seat}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
