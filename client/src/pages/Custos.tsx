import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, CheckCircle, XCircle, Clock, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryConfig = {
  transporte: { label: "Transporte", color: "bg-blue-100 text-blue-700" },
  hospedagem: { label: "Hospedagem", color: "bg-teal-100 text-teal-700" },
  alimentacao: { label: "Alimentação", color: "bg-orange-100 text-orange-700" },
  outros: { label: "Outros", color: "bg-purple-100 text-purple-700" },
};

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-orange-100 text-orange-700", icon: Clock },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejeitado: { label: "Rejeitado", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function Custos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");

  const utils = trpc.useUtils();
  const { data: expenses } = trpc.expenses.list.useQuery({
    status: filterStatus !== "all" ? filterStatus : undefined,
    employeeId: filterEmployee !== "all" ? parseInt(filterEmployee) : undefined,
  });
  const { data: summary } = trpc.expenses.summary.useQuery();
  const { data: byEmployee } = trpc.expenses.byEmployee.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: trips } = trpc.trips.list.useQuery();
  const { data: visits } = trpc.visits.list.useQuery();

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); utils.expenses.summary.invalidate(); utils.expenses.byEmployee.invalidate(); toast.success("Despesa registrada!"); setDialogOpen(false); resetForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); utils.expenses.summary.invalidate(); utils.expenses.byEmployee.invalidate(); toast.success("Despesa atualizada!"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); utils.expenses.summary.invalidate(); toast.success("Despesa removida"); },
  });

  const [form, setForm] = useState({
    tripId: "", visitId: "", employeeId: "", employeeName: "",
    category: "transporte", description: "", amount: "0.00",
  });

  function resetForm() {
    setForm({ tripId: "", visitId: "", employeeId: "", employeeName: "", category: "transporte", description: "", amount: "0.00" });
  }

  function handleSubmit() {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Valor inválido"); return; }
    const data: any = {
      tripId: form.tripId ? parseInt(form.tripId) : undefined,
      visitId: form.visitId ? parseInt(form.visitId) : undefined,
      employeeId: form.employeeId ? parseInt(form.employeeId) : undefined,
      employeeName: form.employeeName || undefined,
      category: form.category, description: form.description || undefined,
      amount: form.amount,
    };
    createExpense.mutate(data);
  }

  const cards = [
    { label: "Custo Total", value: `R$ ${(summary?.total ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Aprovado", value: `R$ ${(summary?.approved ?? 0).toFixed(2)}`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pendente", value: `R$ ${(summary?.pending ?? 0).toFixed(2)}`, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Revisão de Custos</h1>
          <p className="text-sm text-muted-foreground">{expenses?.length ?? 0} despesa(s)</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</CardTitle>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}><c.icon className={`h-4 w-4 ${c.color}`} /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-[oklch(0.22_0.02_250)]">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Funcionário:</span>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Totais por Funcionário */}
      {byEmployee && byEmployee.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Totais por Funcionário</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byEmployee.map((e: any, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{e.employeeName || "Sem responsável"}</p>
                    <p className="text-xs text-muted-foreground">{e.count} despesa(s) · {e.pendingCount} pendente(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">R$ {Number(e.total).toFixed(2)}</p>
                    <p className="text-xs text-orange-600">Pendente: R$ {Number(e.pending).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Despesas */}
      {!expenses || expenses.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="flex flex-col items-center py-12">
          <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground text-sm">Nenhuma despesa registrada</p>
        </CardContent></Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {expenses.map(e => {
                const sc = statusConfig[e.status as keyof typeof statusConfig] || statusConfig.pendente;
                const cc = categoryConfig[e.category as keyof typeof categoryConfig] || categoryConfig.outros;
                return (
                  <div key={e.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${cc.color} flex items-center justify-center`}>
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.description || cc.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${cc.color}`}>{cc.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.color} flex items-center gap-1`}><sc.icon className="h-2.5 w-2.5" />{sc.label}</span>
                          {e.employeeName && <span className="text-xs text-muted-foreground">· {e.employeeName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">R$ {Number(e.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <div className="flex gap-1">
                        {e.status === "pendente" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => updateExpense.mutate({ id: e.id, status: "aprovado" })} className="text-green-600 gap-1 text-xs">
                              <CheckCircle className="h-3 w-3" /> Aprovar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => updateExpense.mutate({ id: e.id, status: "rejeitado" })} className="text-red-600 gap-1 text-xs">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover despesa?")) deleteExpense.mutate({ id: e.id }); }} className="text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transporte">Transporte</SelectItem>
                  <SelectItem value="hospedagem">Hospedagem</SelectItem>
                  <SelectItem value="alimentacao">Alimentação</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da despesa" /></div>
            <div><Label>Funcionário</Label>
              <Select value={form.employeeId} onValueChange={v => { const emp = employees?.find(e => e.id.toString() === v); setForm(f => ({ ...f, employeeId: v, employeeName: emp?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Viagem</Label>
              <Select value={form.tripId} onValueChange={v => setForm(f => ({ ...f, tripId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {trips?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.employeeName} — {format(new Date(t.departureDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Visita</Label>
              <Select value={form.visitId} onValueChange={v => setForm(f => ({ ...f, visitId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {visits?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.clientName} — {format(new Date(v.visitDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createExpense.isPending}>Registrar Despesa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
