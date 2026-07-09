import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Calendar, DollarSign, Car, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  agendado: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
  em_andamento: { label: "Em Andamento", color: "bg-orange-100 text-orange-700" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

export default function Relatorios() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(format(firstDay, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [submitted, setSubmitted] = useState({ start: firstDay.getTime(), end: today.getTime() });

  const { data: report, isLoading } = trpc.reports.consolidated.useQuery({
    startDate: submitted.start,
    endDate: submitted.end,
  });

  function handleGenerate() {
    const s = new Date(startDate + "T00:00:00").getTime();
    const e = new Date(endDate + "T23:59:59").getTime();
    setSubmitted({ start: s, end: e });
  }

  const totalExpenses = report?.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0;
  const approvedExpenses = report?.expenses?.filter((e: any) => e.status === "aprovado").reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0;
  const visitStats = {
    total: report?.visits?.length ?? 0,
    concluido: report?.visits?.filter((v: any) => v.status === "concluido").length ?? 0,
    agendado: report?.visits?.filter((v: any) => v.status === "agendado").length ?? 0,
    cancelado: report?.visits?.filter((v: any) => v.status === "cancelado").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada por período</p>
      </div>

      {/* Filtro de Período */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Período</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div><Label>Data Inicial</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><Label>Data Final</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <Button onClick={handleGenerate} className="rounded-lg">Gerar Relatório</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Carregando relatório...</CardContent></Card>
      ) : report ? (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Visitas</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Calendar className="h-4 w-4 text-blue-600" /></div>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{visitStats.total}</div></CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Concluídas</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{visitStats.concluido}</div></CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Viagens</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Car className="h-4 w-4 text-indigo-600" /></div>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.trips?.length ?? 0}</div></CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Custos Totais</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><DollarSign className="h-4 w-4 text-purple-600" /></div>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">R$ {totalExpenses.toFixed(2)}</div></CardContent>
            </Card>
          </div>

          {/* Detalhamento de Visitas */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Visitas no Período</CardTitle></CardHeader>
            <CardContent>
              {!report.visits?.length ? (
                <p className="text-center py-6 text-muted-foreground text-sm">Nenhuma visita no período</p>
              ) : (
                <div className="space-y-2">
                  {report.visits.map((v: any) => {
                    const sc = statusConfig[v.status as keyof typeof statusConfig] || statusConfig.agendado;
                    return (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                        <div>
                          <p className="text-sm font-medium">{v.clientName}</p>
                          <p className="text-xs text-muted-foreground">{v.address}, {v.city}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                          <span className="text-sm text-muted-foreground">{format(new Date(v.visitDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhamento de Custos */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Despesas no Período</CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Aprovado:</span>
                <span className="font-bold text-green-600">R$ {approvedExpenses.toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent>
              {!report.expenses?.length ? (
                <p className="text-center py-6 text-muted-foreground text-sm">Nenhuma despesa no período</p>
              ) : (
                <div className="space-y-2">
                  {report.expenses.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div>
                        <p className="text-sm font-medium">{e.description || e.category}</p>
                        <p className="text-xs text-muted-foreground">{e.employeeName || "Sem responsável"} · {format(new Date(e.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${e.status === "aprovado" ? "bg-green-100 text-green-700" : e.status === "pendente" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>{e.status}</span>
                        <span className="text-sm font-bold">R$ {Number(e.amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
