import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Configuracoes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("perfil");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil do usuário</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-1">
          <TabsTrigger value="perfil" className="gap-1.5"><User className="h-4 w-4" /> Perfil</TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Informações do Usuário</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[oklch(0.48_0.18_250)] flex items-center justify-center text-white text-xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-lg font-semibold">{user?.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || "—"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{user?.role || "user"}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="text-sm font-medium">{user?.id ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Último Acesso</Label>
                  <p className="text-sm font-medium">{user?.lastSignedIn ? format(new Date(user.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Sobre o Sistema</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Sistema:</span><span className="font-medium text-foreground">SA Labtech FieldOps</span></div>
              <div className="flex justify-between"><span>Versão:</span><span className="font-medium text-foreground">1.0.0</span></div>
              <div className="flex justify-between"><span>Módulos:</span><span className="font-medium text-foreground">9 ativos</span></div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
