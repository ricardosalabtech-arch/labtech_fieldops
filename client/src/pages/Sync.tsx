import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false);
  const utils = trpc.useUtils();

  const { data: syncHistory, isLoading } = trpc.sync.history.useQuery({ limit: 50 });
  const { data: syncStatus } = trpc.sync.status.useQuery();

  const toggleHeartbeatMutation = trpc.sync.toggleHeartbeat.useMutation({
    onSuccess: (data) => {
      toast.success(data.enabled ? "Sincronização automática ativada" : "Sincronização automática desativada");
      utils.sync.status.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const pushAllMutation = trpc.sync.pushAll.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronização concluída: ${data.pushed} de ${data.total} visitas enviadas para salabtech.com`);
      utils.sync.history.invalidate();
      setSyncing(false);
    },
    onError: (error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
      setSyncing(false);
    },
  });

  const handleFullSync = () => {
    setSyncing(true);
    pushAllMutation.mutate();
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const directionBadge = (direction: string) => {
    if (direction === "push") {
      return <Badge variant="outline" className="text-blue-600"><ArrowUpCircle className="w-3 h-3 mr-1" />Push</Badge>;
    }
    return <Badge variant="outline" className="text-purple-600"><ArrowDownCircle className="w-3 h-3 mr-1" />Pull</Badge>;
  };

  const successCount = syncHistory?.filter((log: any) => log.status === "success").length ?? 0;
  const errorCount = syncHistory?.filter((log: any) => log.status === "error").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sincronização com salabtech.com</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie a sincronização de agendas entre o FieldOps e o aplicativo de serviço salabtech.com
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={syncStatus?.enabled ? "default" : "outline"}
            onClick={() => toggleHeartbeatMutation.mutate({ enable: !syncStatus?.enabled })}
            disabled={toggleHeartbeatMutation.isPending}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {syncStatus?.enabled ? "Auto-Sync Ativo" : "Ativar Auto-Sync"}
          </Button>
          <Button onClick={handleFullSync} disabled={syncing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar Tudo"}
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Sincronizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncHistory?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sucessos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Erros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Status do Auto-Sync */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status da Sincronização Automática</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              {syncStatus.enabled ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Ativo</Badge>
              ) : (
                <Badge variant="outline">Inativo</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Frequência:</span>
              <span className="font-mono text-xs">{syncStatus.cron}</span>
            </div>
            {syncStatus.lastExecuted && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Última execução:</span>
                <span>{formatDate(syncStatus.lastExecuted)}</span>
              </div>
            )}
            {syncStatus.nextExecution && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Próxima execução:</span>
                <span>{formatDate(syncStatus.nextExecution)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como a Sincronização Funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Push (FieldOps → salabtech.com):</strong> Quando uma visita é criada ou seu status muda no FieldOps, os dados são enviados automaticamente para o salabtech.com, criando ou atualizando uma Ordem de Serviço correspondente.</p>
          <p><strong className="text-foreground">Pull (salabtech.com → FieldOps):</strong> Quando o status de uma OS muda no salabtech.com, o aplicativo envia uma atualização via PATCH para o FieldOps, que atualiza o status da visita correspondente.</p>
          <p><strong className="text-foreground">Sincronização Manual:</strong> Use o botão "Sincronizar Tudo" para reenviar todas as visitas ativas (agendadas e em andamento) para o salabtech.com.</p>
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Sincronização</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : syncHistory && syncHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Visita</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.syncedAt)}</TableCell>
                    <TableCell className="text-sm">#{log.visitId ?? "—"}</TableCell>
                    <TableCell>{directionBadge(log.direction)}</TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell>{statusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {log.errorMessage || log.response || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sincronização realizada ainda.</p>
              <p className="text-xs mt-1">Crie uma visita ou clique em "Sincronizar Tudo" para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
