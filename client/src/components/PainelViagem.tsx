import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, CloudRain, Navigation, DollarSign, Fuel, Coffee, Hotel, Building2, Clock, Car, Plane, ChevronRight, Route, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import WeatherWidget from "@/components/WeatherWidget";
import WazeLink from "@/components/WazeLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PainelViagemProps {
  trip: any;
  visit: any;
  hotels: any[];
  flights: any[];
  expenses: any[];
}

interface StepItem {
  icon: any;
  title: string;
  color: string;
  bg: string;
  content: React.ReactNode;
}

export default function PainelViagem({ trip, visit, hotels, flights, expenses }: PainelViagemProps) {
  const [fuelPrice, setFuelPrice] = useState("6.50");
  const [fuelConsumption, setFuelConsumption] = useState("10");
  const [distance, setDistance] = useState("");

  const destCity = visit?.city || trip?.returnAddress || "—";
  const destAddress = visit?.address || "";
  const clientName = visit?.clientName || "—";

  // Calcular custo de combustível
  const fuelCost = useMemo(() => {
    const d = parseFloat(distance);
    const price = parseFloat(fuelPrice);
    const cons = parseFloat(fuelConsumption);
    if (!d || !price || !cons) return null;
    return (d / cons) * price;
  }, [distance, fuelPrice, fuelConsumption]);

  // Custos de pedágio das despesas
  const tollExpenses = expenses?.filter(e => e.category === "transporte" && e.description?.toLowerCase().includes("ped")) || [];
  const totalTolls = tollExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Custos de combustível das despesas
  const fuelExpenses = expenses?.filter(e => e.category === "transporte" && (e.description?.toLowerCase().includes("combust") || e.description?.toLowerCase().includes("gasolin") || e.description?.toLowerCase().includes("etanol"))) || [];
  const totalFuel = fuelExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Paradas de alimentação
  const foodStops = expenses?.filter(e => e.category === "alimentacao") || [];
  const totalFood = foodStops.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const isFlight = trip?.transportMode === "aviao";
  const departureDate = trip?.departureDate ? new Date(trip.departureDate) : null;
  const returnDate = trip?.returnDate ? new Date(trip.returnDate) : null;

  // Previsão de chegada (estimativa simples)
  const arrivalEstimate = useMemo(() => {
    if (!departureDate || !distance) return null;
    const avgSpeed = 80; // km/h média
    const d = parseFloat(distance);
    const hours = d / avgSpeed;
    const arrival = new Date(departureDate);
    arrival.setHours(arrival.getHours() + Math.ceil(hours));
    return arrival;
  }, [departureDate, distance]);

  const steps: StepItem[] = [
    // 1. Destino
    {
      icon: MapPin,
      title: "Destino",
      color: "text-blue-600",
      bg: "bg-blue-50",
      content: (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{destCity}</p>
          {destAddress && <p className="text-xs text-muted-foreground">{destAddress}{visit?.state ? ` - ${visit.state}` : ""}</p>}
          {departureDate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
              <Clock className="h-3 w-3" />
              Saída: {format(departureDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      ),
    },
    // 2. Previsão de chegada
    {
      icon: Clock,
      title: "Previsão de Chegada",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      content: (
        <div className="space-y-2">
          {arrivalEstimate ? (
            <p className="text-sm font-medium text-foreground">
              {format(arrivalEstimate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isFlight ? "Baseado no voo" : "Informe a distância para estimar"}
            </p>
          )}
          {isFlight && flights?.[0]?.arrivalDateTime && (
            <p className="text-xs text-muted-foreground">
              Voo: {format(new Date(flights[0].arrivalDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
          {!isFlight && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Distância (km)"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                className="h-7 text-xs w-28"
              />
              <span className="text-xs text-muted-foreground">km</span>
            </div>
          )}
        </div>
      ),
    },
    // 3. Clima
    {
      icon: CloudRain,
      title: "Clima no Destino",
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      content: (
        <div>
          {destCity && destCity !== "—" ? (
            <WeatherWidget city={destCity} date={departureDate || undefined} compact={true} />
          ) : (
            <p className="text-xs text-muted-foreground">Sem cidade de destino</p>
          )}
        </div>
      ),
    },
    // 4. Rota / Trânsito
    {
      icon: Route,
      title: "Rota / Trânsito",
      color: "text-purple-600",
      bg: "bg-purple-50",
      content: (
        <div className="space-y-2">
          {destAddress && destCity !== "—" ? (
            <>
              <WazeLink address={destAddress} city={destCity} label="Abrir rota no Waze" />
              {!isFlight && distance && (
                <p className="text-xs text-muted-foreground">
                  Distância estimada: {distance} km
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Sem endereço de destino</p>
          )}
        </div>
      ),
    },
    // 5. Pedágios
    {
      icon: DollarSign,
      title: "Pedágios",
      color: "text-amber-600",
      bg: "bg-amber-50",
      content: (
        <div className="space-y-1">
          {tollExpenses.length > 0 ? (
            <>
              <p className="text-sm font-medium text-foreground">R$ {totalTolls.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{tollExpenses.length} pedágio(s) registrado(s)</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum pedágio registrado</p>
          )}
        </div>
      ),
    },
    // 6. Combustível
    {
      icon: Fuel,
      title: "Combustível",
      color: "text-green-600",
      bg: "bg-green-50",
      content: (
        <div className="space-y-2">
          {totalFuel > 0 && (
            <p className="text-sm font-medium text-foreground">R$ {totalFuel.toFixed(2)} (registrado)</p>
          )}
          {!isFlight && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16">Preço/L</Label>
                <Input type="number" step="0.01" value={fuelPrice} onChange={e => setFuelPrice(e.target.value)} className="h-7 text-xs w-20" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16">Km/L</Label>
                <Input type="number" step="0.1" value={fuelConsumption} onChange={e => setFuelConsumption(e.target.value)} className="h-7 text-xs w-20" />
              </div>
              {fuelCost && (
                <p className="text-xs font-medium text-green-700">
                  Estimativa: R$ {fuelCost.toFixed(2)}
                </p>
              )}
            </div>
          )}
          {isFlight && <p className="text-xs text-muted-foreground">Aplicável para viagens de carro</p>}
        </div>
      ),
    },
    // 7. Paradas
    {
      icon: Coffee,
      title: "Paradas / Alimentação",
      color: "text-orange-600",
      bg: "bg-orange-50",
      content: (
        <div className="space-y-1">
          {foodStops.length > 0 ? (
            <>
              <p className="text-sm font-medium text-foreground">R$ {totalFood.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{foodStops.length} parada(s) para alimentação</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma parada registrada</p>
          )}
        </div>
      ),
    },
    // 8. Hotel
    {
      icon: Hotel,
      title: "Hospedagem",
      color: "text-teal-600",
      bg: "bg-teal-50",
      content: (
        <div className="space-y-2">
          {hotels.length > 0 ? (
            hotels.map(h => (
              <div key={h.id} className="text-xs space-y-1">
                <p className="font-medium text-foreground">{h.hotelName}</p>
                <p className="text-muted-foreground">
                  {h.city} · {format(new Date(h.checkIn), "dd/MM", { locale: ptBR })} → {format(new Date(h.checkOut), "dd/MM", { locale: ptBR })}
                </p>
                <p className="text-muted-foreground">R$ {Number(h.value).toFixed(2)}</p>
                <a
                  href={`https://www.waze.com/ul?q=${encodeURIComponent(`${h.hotelName}, ${h.city}`)}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-600 text-white text-[10px] font-medium hover:bg-teal-700 transition-colors"
                >
                  <Navigation className="h-3 w-3" />
                  Navegar para o Hotel
                </a>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma reserva de hotel</p>
          )}
        </div>
      ),
    },
    // 9. Cliente
    {
      icon: Building2,
      title: "Cliente",
      color: "text-blue-600",
      bg: "bg-blue-50",
      content: (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{clientName}</p>
          {visit?.address && <p className="text-xs text-muted-foreground">{visit.address}, {visit.city}{visit.state ? ` - ${visit.state}` : ""}</p>}
          {visit?.contactName && <p className="text-xs text-muted-foreground">Contato: {visit.contactName}</p>}
          {visit?.contactPhone && <p className="text-xs text-muted-foreground">Tel: {visit.contactPhone}</p>}
          {visit?.address && (
            <a
              href={`https://www.waze.com/ul?q=${encodeURIComponent(`${visit.address}, ${visit.city}`)}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[oklch(0.48_0.18_250)] text-white text-[10px] font-medium hover:bg-[oklch(0.38_0.18_250)] transition-colors mt-1"
            >
              <Navigation className="h-3 w-3" />
              Navegar para o Cliente
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Navigation className="h-4 w-4 text-blue-600" />
        <h4 className="text-sm font-semibold">Painel da Viagem</h4>
        <span className="text-[10px] text-muted-foreground ml-auto">{steps.length} etapas</span>
      </div>

      {/* Timeline horizontal */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center shrink-0">
            <div className={`w-7 h-7 rounded-full ${step.bg} flex items-center justify-center`}>
              <step.icon className={`h-3.5 w-3.5 ${step.color}`} />
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* Cards de detalhes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <div key={i} className="rounded-lg border bg-white p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md ${step.bg} flex items-center justify-center shrink-0`}>
                <step.icon className={`h-3.5 w-3.5 ${step.color}`} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step.title}</span>
            </div>
            {step.content}
          </div>
        ))}
      </div>

      {/* Resumo de custos */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo de Custos</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Pedágios: <strong className="text-foreground">R$ {totalTolls.toFixed(2)}</strong></span>
          <span className="text-muted-foreground">Combustível: <strong className="text-foreground">R$ {(totalFuel + (fuelCost || 0)).toFixed(2)}</strong></span>
          <span className="text-muted-foreground">Alimentação: <strong className="text-foreground">R$ {totalFood.toFixed(2)}</strong></span>
          <span className="text-muted-foreground">Hotel: <strong className="text-foreground">R$ {hotels.reduce((s, h) => s + Number(h.value), 0).toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  );
}
