import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, DollarSign, Building2, BedDouble, Plus, ArrowRight, Plane, Search, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import WazeLink from "@/components/WazeLink";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: visits } = trpc.visits.list.useQuery({ status: "agendado" });
  const { data: allVisits } = trpc.visits.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: trips } = trpc.trips.list.useQuery();
  const { data: flights } = trpc.flightBookings.list.useQuery();
  const { data: expenses } = trpc.expenses.list.useQuery();
  const { data: documents } = trpc.documents.list.useQuery();
  const { data: auditLog } = trpc.auditLog.list.useQuery();
  const [, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: format(d, "MMM", { locale: ptBR }), visits: 0, costs: 0 };
    });
    allVisits?.forEach(v => {
      const m = format(new Date(v.visitDate), "MMM", { locale: ptBR });
      const entry = months.find(x => x.month === m);
      if (entry) entry.visits++;
    });
    expenses?.forEach(e => {
      const m = format(new Date(e.createdAt), "MMM", { locale: ptBR });
      const entry = months.find(x => x.month === m);
      if (entry) entry.costs += parseFloat(e.amount);
    });
    return months;
  }, [allVisits, expenses]);

  const costByCategory = useMemo(() => {
    const cats = { transporte: 0, hospedagem: 0, alimentacao: 0, outros: 0 };
    expenses?.forEach(e => { cats[e.category as keyof typeof cats] += parseFloat(e.amount); });
    return [
      { name: "Transporte", value: cats.transporte, fill: "oklch(0.62 0.19 250)" },
      { name: "Hospedagem", value: cats.hospedagem, fill: "oklch(0.70 0.15 180)" },
      { name: "Alimentação", value: cats.alimentacao, fill: "oklch(0.72 0.18 140)" },
      { name: "Outros", value: cats.outros, fill: "oklch(0.75 0.15 80)" },
    ];
  }, [expenses]);

  const completionRate = useMemo(() => {
    const total = allVisits?.length || 0;
    const done = allVisits?.filter(v => v.status === "concluido")?.length || 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [allVisits]);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </div>
      </div>

      {/* Busca Global */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Buscar visitas, clientes, viagens..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {allVisits && allVisits.length > 0 && (
            <CommandGroup heading="Visitas">
              {allVisits.filter(v => v.clientName).slice(0, 5).map(v => (
                <CommandItem key={v.id} onSelect={() => { setSearchOpen(false); setLocation("/agendamentos"); }}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>{v.clientName} — {format(new Date(v.visitDate), "dd/MM/yyyy")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {clients && clients.length > 0 && (
            <CommandGroup heading="Clientes">
              {clients.slice(0, 5).map(c => (
                <CommandItem key={c.id} onSelect={() => { setSearchOpen(false); setLocation("/clientes"); }}>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>{c.companyName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {trips && trips.length > 0 && (
            <CommandGroup heading="Viagens">
              {trips.slice(0, 5).map(t => (
                <CommandItem key={t.id} onSelect={() => { setSearchOpen(false); setLocation("/viagens"); }}>
                  <Plane className="mr-2 h-4 w-4" />
                  <span>{t.employeeName || "Viagem"} — {format(new Date(t.departureDate), "dd/MM/yyyy")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {documents && documents.length > 0 && (
            <CommandGroup heading="Documentos">
              {documents.slice(0, 5).map(d => (
                <CommandItem key={d.id} onSelect={() => { setSearchOpen(false); setLocation("/documentos"); }}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{d.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="text-base font-semibold">Visitas e Custos (6 meses)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{ visits: { label: "Visitas" }, costs: { label: "Custos" } }} className="h-[200px] w-full">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visits" fill="oklch(0.62 0.19 250)" radius={4} />
                <Bar dataKey="costs" fill="oklch(0.70 0.15 180)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">Custos por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: "Valor" } }} className="h-[200px] w-full">
              <PieChart>
                <Pie data={costByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {costByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Conclusão */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão de Visitas</p>
              <p className="text-3xl font-bold text-foreground mt-1">{completionRate}%</p>
            </div>
            <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(oklch(0.62 0.19 250) ${completionRate}%, oklch(0.90 0.005 250) 0)` }}>
              <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{completionRate}%</span>
              </div>
            </div>
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

      {/* Histórico de Alterações */}
      {auditLog && auditLog.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">Histórico de Alterações</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {auditLog.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {log.action === "create" ? "Criou" : log.action === "update" ? "Atualizou" : "Excluiu"} {log.entity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.changedBy} · {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
