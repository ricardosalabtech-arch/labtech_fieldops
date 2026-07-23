import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Agendamentos from "./pages/Agendamentos";
import Cadastro from "@/pages/Cadastro";
import Viagens from "./pages/Viagens";
import Reservas from "./pages/Reservas";
import Documentos from "./pages/Documentos";
import Custos from "./pages/Custos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";

function Router() {
  return (
    <Switch>
      <Route path={"/"} nest>
        <DashboardLayout>
          <Switch>
            <Route path={"/dashboard"} component={Dashboard} />
            <Route path={"/viagens"} component={Viagens} />
            <Route path={"/agendamentos"} component={Agendamentos} />
            <Route path={"/cadastro"} component={Cadastro} />
            <Route path={"/reservas"} component={Reservas} />
            <Route path={"/documentos"} component={Documentos} />
            <Route path={"/custos"} component={Custos} />
            <Route path={"/relatorios"} component={Relatorios} />
            <Route path={"/configuracoes"} component={Configuracoes} />
            <Route component={Dashboard} />
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
