import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import DashboardViagem from "./pages/DashboardViagem";
import Agendamentos from "./pages/Agendamentos";
import Cadastro from "@/pages/Cadastro";
import Viagens from "./pages/Viagens";
import Reservas from "./pages/Reservas";
import Documentos from "./pages/Documentos";
import Custos from "./pages/Custos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import { useAuth } from "./_core/hooks/useAuth";

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === "tecnico" || user?.role === "especialista") {
    return <DashboardViagem />;
  }
  return <Dashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} nest>
        <DashboardLayout>
          <Switch>
            <Route path={"/dashboard"} component={DashboardRedirect} />
            <Route path={"/viagens"} component={Viagens} />
            <Route path={"/agendamentos"} component={Agendamentos} />
            <Route path={"/cadastro"} component={Cadastro} />
            <Route path={"/reservas"} component={Reservas} />
            <Route path={"/documentos"} component={Documentos} />
            <Route path={"/custos"} component={Custos} />
            <Route path={"/relatorios"} component={Relatorios} />
            <Route path={"/configuracoes"} component={Configuracoes} />
            <Route component={DashboardRedirect} />
          </Switch>
        </DashboardLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
