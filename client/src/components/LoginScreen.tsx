import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2, Lock, Mail, Building2, User } from "lucide-react";
import { toast } from "sonner";

export default function LoginScreen() {
  const { loginWithPassword, isLoginLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"choose" | "password">("choose");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithPassword({ email, password });
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "E-mail ou senha inválidos");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[oklch(0.42_0.15_250)] to-[oklch(0.28_0.10_250)]">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[oklch(0.48_0.18_250)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">SA</span>
              </div>
              <span className="font-bold text-lg text-[oklch(0.22_0.02_250)]">LABTECH</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Gestão de Campo
            </h1>
            <p className="text-sm text-white/70 text-center max-w-sm mt-2">
              Acesso restrito. Faça login para gerenciar viagens, agendamentos e hospedagem.
            </p>
          </div>
        </div>

        {mode === "choose" ? (
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => startLogin()}
              size="lg"
              className="w-full shadow-lg hover:shadow-xl transition-all bg-white text-[oklch(0.48_0.18_250)] hover:bg-white/90"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Entrar como Administrador
            </Button>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-xs text-white/50 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>
            <Button
              onClick={() => setMode("password")}
              size="lg"
              variant="outline"
              className="w-full shadow-lg hover:shadow-xl transition-all bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <User className="w-4 h-4 mr-2" />
              Entrar como Técnico / Especialista
            </Button>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4 w-full bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email" className="text-sm font-medium text-[oklch(0.22_0.02_250)]">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="password" className="text-sm font-medium text-[oklch(0.22_0.02_250)]">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isLoginLoading}
              className="w-full bg-[oklch(0.48_0.18_250)] text-white hover:bg-[oklch(0.42_0.16_250)]"
            >
              {isLoginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              ← Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
