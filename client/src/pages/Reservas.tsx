import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Plus, MapPin, Calendar, Trash2, Pencil, DollarSign, FileCheck, Plane } from "lucide-react";
import WazeLink from "@/components/WazeLink";
import WeatherWidget from "@/components/WeatherWidget";
import FileUpload from "@/components/FileUpload";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";

const statusConfig = {
  confirmada: { label: "Confirmada", color: "bg-green-100 text-green-700 border-green-200" },
  pendente: { label: "Pendente", color: "bg-orange-100 text-orange-700 border-orange-200" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function Reservas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("hoteis");
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [flightDialogOpen, setFlightDialogOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const utils = trpc.useUtils();
  const { data: reservations, isLoading: reservationsLoading } = trpc.hotelReservations.list.useQuery({ status: filterStatus !== "all" ? filterStatus : undefined });
  const { data: flights, isLoading: flightsLoading } = trpc.flightBookings.list.useQuery({ status: filterStatus !== "all" ? filterStatus : undefined });
  const { data: trips } = trpc.trips.list.useQuery();
  const { data: visits } = trpc.visits.list.useQuery();

  // Hotel mutations
  const createRes = trpc.hotelReservations.create.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva de hotel criada!"); setHotelDialogOpen(false); resetHotelForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateRes = trpc.hotelReservations.update.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva atualizada!"); setHotelDialogOpen(false); resetHotelForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteRes = trpc.hotelReservations.delete.useMutation({
    onSuccess: () => { utils.hotelReservations.list.invalidate(); toast.success("Reserva removida"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // Flight mutations
  const createFlight = trpc.flightBookings.create.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Passagem criada!"); setFlightDialogOpen(false); resetFlightForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateFlight = trpc.flightBookings.update.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Passagem atualizada!"); setFlightDialogOpen(false); resetFlightForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteFlight = trpc.flightBookings.delete.useMutation({
    onSuccess: () => { utils.flightBookings.list.invalidate(); toast.success("Passagem removida"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const [hotelForm, setHotelForm] = useState({
    tripId: "", hotelName: "", city: "",
    checkIn: "", checkOut: "", confirmationNumber: "",
    value: "0.00", observations: "", status: "pendente", voucherUrl: "",
  });

  const [flightForm, setFlightForm] = useState({
    tripId: "", airline: "", flightNumber: "", originAirport: "", destinationAirport: "",
    originCity: "", destinationCity: "", departureDateTime: "", arrivalDateTime: "",
    seat: "", gate: "", bookingCode: "", passengerName: "", value: "0.00",
    status: "pendente", notes: "", voucherUrl: "",
  });

  function resetHotelForm() {
    setHotelForm({ tripId: "", hotelName: "", city: "", checkIn: "", checkOut: "", confirmationNumber: "", value: "0.00", observations: "", status: "pendente", voucherUrl: "" });
    setEditingHotel(null);
  }

  function resetFlightForm() {
    setFlightForm({ tripId: "", airline: "", flightNumber: "", originAirport: "", destinationAirport: "", originCity: "", destinationCity: "", departureDateTime: "", arrivalDateTime: "", seat: "", gate: "", bookingCode: "", passengerName: "", value: "0.00", status: "pendente", notes: "", voucherUrl: "" });
    setEditingFlight(null);
  }

  function openNewHotel() { resetHotelForm(); setHotelDialogOpen(true); }

  function openEditHotel(r: any) {
    setEditingHotel(r);
    setHotelForm({
      tripId: r.tripId?.toString() || "",
      hotelName: r.hotelName || "", city: r.city || "",
      checkIn: r.checkIn ? format(new Date(r.checkIn), "yyyy-MM-dd") : "",
      checkOut: r.checkOut ? format(new Date(r.checkOut), "yyyy-MM-dd") : "",
      confirmationNumber: r.confirmationNumber || "", value: r.value?.toString() || "0.00",
      observations: r.observations || "", status: r.status || "pendente", voucherUrl: r.voucherUrl || "",
    });
    setHotelDialogOpen(true);
  }

  function openNewFlight() { resetFlightForm(); setFlightDialogOpen(true); }

  function openEditFlight(f: any) {
    setEditingFlight(f);
    setFlightForm({
      tripId: f.tripId?.toString() || "",
      airline: f.airline || "", flightNumber: f.flightNumber || "",
      originAirport: f.originAirport || "", destinationAirport: f.destinationAirport || "",
      originCity: f.originCity || "", destinationCity: f.destinationCity || "",
      departureDateTime: f.departureDateTime ? format(new Date(f.departureDateTime), "yyyy-MM-dd'T'HH:mm") : "",
      arrivalDateTime: f.arrivalDateTime ? format(new Date(f.arrivalDateTime), "yyyy-MM-dd'T'HH:mm") : "",
      seat: f.seat || "", gate: f.gate || "", bookingCode: f.bookingCode || "",
      passengerName: f.passengerName || "", value: f.value?.toString() || "0.00",
      status: f.status || "pendente", notes: f.notes || "", voucherUrl: f.voucherUrl || "",
    });
    setFlightDialogOpen(true);
  }

  function handleHotelSubmit() {
    if (!hotelForm.hotelName?.trim()) { toast.error("Nome do hotel é obrigatório"); return; }
    if (!hotelForm.city?.trim()) { toast.error("Cidade é obrigatória"); return; }
    if (!hotelForm.checkIn) { toast.error("Data de check-in é obrigatória"); return; }
    if (!hotelForm.checkOut) { toast.error("Data de check-out é obrigatória"); return; }
    if (hotelForm.checkIn && hotelForm.checkOut && new Date(hotelForm.checkOut) <= new Date(hotelForm.checkIn)) {
      toast.error("Data de check-out deve ser posterior ao check-in"); return;
    }
    const data: any = {
      tripId: hotelForm.tripId ? parseInt(hotelForm.tripId) : undefined,
      hotelName: hotelForm.hotelName, city: hotelForm.city,
      checkIn: new Date(hotelForm.checkIn + "T00:00:00").getTime(),
      checkOut: new Date(hotelForm.checkOut + "T00:00:00").getTime(),
      confirmationNumber: hotelForm.confirmationNumber || undefined,
      value: hotelForm.value, observations: hotelForm.observations || undefined,
      status: hotelForm.status, voucherUrl: hotelForm.voucherUrl || undefined,
    };
    if (editingHotel) updateRes.mutate({ id: editingHotel.id, ...data });
    else createRes.mutate(data);
  }

  function handleFlightSubmit() {
    if (!flightForm.airline || !flightForm.flightNumber || !flightForm.originAirport || !flightForm.destinationAirport || !flightForm.departureDateTime) {
      toast.error("Preencha companhia, voo, aeroportos e data de partida");
      return;
    }
    const data: any = {
      tripId: flightForm.tripId ? parseInt(flightForm.tripId) : undefined,
      airline: flightForm.airline, flightNumber: flightForm.flightNumber,
      originAirport: flightForm.originAirport, destinationAirport: flightForm.destinationAirport,
      originCity: flightForm.originCity || undefined, destinationCity: flightForm.destinationCity || undefined,
      departureDateTime: new Date(flightForm.departureDateTime).getTime(),
      arrivalDateTime: flightForm.arrivalDateTime ? new Date(flightForm.arrivalDateTime).getTime() : undefined,
      seat: flightForm.seat || undefined, gate: flightForm.gate || undefined,
      bookingCode: flightForm.bookingCode || undefined, passengerName: flightForm.passengerName || undefined,
      value: flightForm.value || "0.00", status: flightForm.status,
      notes: flightForm.notes || undefined, voucherUrl: flightForm.voucherUrl || undefined,
    };
    if (editingFlight) updateFlight.mutate({ id: editingFlight.id, ...data });
    else createFlight.mutate(data);
  }

  const filters = [
    { label: "Todas", value: "all" },
    { label: "Confirmadas", value: "confirmada" },
    { label: "Pendentes", value: "pendente" },
    { label: "Canceladas", value: "cancelada" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reserva de Hotel e Passagens</h1>
          <p className="text-sm text-muted-foreground">
            {reservations?.length ?? 0} reserva(s) de hotel · {flights?.length ?? 0} passagem(ns) aérea(s)
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="hoteis" className="gap-1.5"><BedDouble className="h-4 w-4" /> Hotéis</TabsTrigger>
          <TabsTrigger value="passagens" className="gap-1.5"><Plane className="h-4 w-4" /> Passagens</TabsTrigger>
        </TabsList>

        {/* Tab Hotéis */}
        <TabsContent value="hoteis" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button key={f.value} onClick={() => setFilterStatus(f.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterStatus === f.value ? "bg-primary text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
                  }`}>{f.label}</button>
              ))}
            </div>
            {isAdmin && <Button onClick={openNewHotel} className="gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Nova Reserva
            </Button>}
          </div>

          {reservationsLoading ? (
            <LoadingSkeleton type="card" count={3} />
          ) : !reservations || reservations.length === 0 ? (
            <Card className="shadow-sm border border-border">
              <CardContent>
                <EmptyState icon={BedDouble} title="Nenhuma reserva de hotel" description={isAdmin ? "Crie a primeira reserva de hotel para suas viagens." : "Nenhuma reserva de hotel disponível."} action={isAdmin ? <Button onClick={openNewHotel} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Criar reserva</Button> : undefined} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reservations.map(r => {
                const sc = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pendente;
                return (
                  <Card key={r.id} className="shadow-sm border border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                          <BedDouble className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{r.hotelName}</CardTitle>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Check-in: {format(new Date(r.checkIn), "dd/MM/yyyy", { locale: ptBR })}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Check-out: {format(new Date(r.checkOut), "dd/MM/yyyy", { locale: ptBR })}</div>
                        {r.confirmationNumber && <p className="text-xs">Confirmação: {r.confirmationNumber}</p>}
                        <div className="flex items-center gap-1.5 font-medium text-foreground"><DollarSign className="h-3.5 w-3.5" />R$ {Number(r.value).toFixed(2)}</div>
                      </div>
                      {r.city && <WeatherWidget city={r.city} compact />}
                      {r.voucherUrl && (
                        <a href={r.voucherUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-teal-600 hover:underline pt-1">
                          <FileCheck className="h-3.5 w-3.5" /> Ver voucher da reserva
                        </a>
                      )}
                      {isAdmin && <div className="pt-2 border-t">
                        <FileUpload
                          category="voucher"
                          refId={r.id}
                          label="Anexar voucher desta reserva"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onUploaded={(doc) => {
                            updateRes.mutate({ id: r.id, voucherUrl: doc.fileUrl });
                          }}
                        />
                      </div>}
                      <div className="flex gap-2 pt-2">
                        <WazeLink address={r.hotelName} city={r.city} />
                        {isAdmin && <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => openEditHotel(r)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>}
                        {isAdmin && <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover reserva?" description={`Remover reserva no ${r.hotelName}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteRes.mutate({ id: r.id })} />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab Passagens */}
        <TabsContent value="passagens" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button key={f.value} onClick={() => setFilterStatus(f.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterStatus === f.value ? "bg-primary text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
                  }`}>{f.label}</button>
              ))}
            </div>
            {isAdmin && <Button onClick={openNewFlight} className="gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Nova Passagem
            </Button>}
          </div>

          {flightsLoading ? (
            <LoadingSkeleton type="card" count={3} />
          ) : !flights || flights.length === 0 ? (
            <Card className="shadow-sm border border-border">
              <CardContent>
                <EmptyState icon={Plane} title="Nenhuma passagem aérea" description={isAdmin ? "Crie a primeira passagem aérea para suas viagens." : "Nenhuma passagem aérea disponível."} action={isAdmin ? <Button onClick={openNewFlight} className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Criar passagem</Button> : undefined} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flights.map(f => {
                const sc = statusConfig[f.status as keyof typeof statusConfig] || statusConfig.pendente;
                return (
                  <Card key={f.id} className="shadow-sm border border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Plane className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{f.airline} · {f.flightNumber}</CardTitle>
                          <p className="text-xs text-muted-foreground">{f.originAirport} → {f.destinationAirport}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Partida: {format(new Date(f.departureDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                        {f.arrivalDateTime && <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Chegada: {format(new Date(f.arrivalDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>}
                        {f.passengerName && <p className="text-xs">Passageiro: {f.passengerName}</p>}
                        {f.seat && <p className="text-xs">Assento: {f.seat}</p>}
                        {f.bookingCode && <p className="text-xs">Código: {f.bookingCode}</p>}
                        <div className="flex items-center gap-1.5 font-medium text-foreground"><DollarSign className="h-3.5 w-3.5" />R$ {Number(f.value).toFixed(2)}</div>
                      </div>
                      {f.voucherUrl && (
                        <a href={f.voucherUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline pt-1">
                          <FileCheck className="h-3.5 w-3.5" /> Ver voucher do voo
                        </a>
                      )}
                      {isAdmin && <div className="pt-2 border-t">
                        <FileUpload
                          category="passagem"
                          refId={f.id}
                          label="Anexar voucher da passagem"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onUploaded={(doc) => {
                            updateFlight.mutate({ id: f.id, voucherUrl: doc.fileUrl });
                          }}
                        />
                      </div>}
                      <div className="flex gap-2 pt-2">
                        {isAdmin && <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => openEditFlight(f)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>}
                        {isAdmin && <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover passagem?" description={`Remover passagem ${f.airline} ${f.flightNumber}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteFlight.mutate({ id: f.id })} />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Hotel Dialog */}
      <Dialog open={hotelDialogOpen} onOpenChange={o => { setHotelDialogOpen(o); if (!o) resetHotelForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingHotel ? "Editar Reserva de Hotel" : "Nova Reserva de Hotel"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><Label>Hotel *</Label><Input value={hotelForm.hotelName} onChange={e => setHotelForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Nome do hotel" /></div>
            <div><Label>Cidade *</Label><Input value={hotelForm.city} onChange={e => setHotelForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>Número de Confirmação</Label><Input value={hotelForm.confirmationNumber} onChange={e => setHotelForm(f => ({ ...f, confirmationNumber: e.target.value }))} /></div>
            <div><Label>Check-in *</Label><Input type="date" value={hotelForm.checkIn} onChange={e => setHotelForm(f => ({ ...f, checkIn: e.target.value }))} /></div>
            <div><Label>Check-out *</Label><Input type="date" value={hotelForm.checkOut} onChange={e => setHotelForm(f => ({ ...f, checkOut: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={hotelForm.value} onChange={e => setHotelForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={hotelForm.status} onValueChange={v => setHotelForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Viagem Associada</Label>
              <Select value={hotelForm.tripId} onValueChange={v => setHotelForm(f => ({ ...f, tripId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {trips?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.employeeName} — {format(new Date(t.departureDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Voucher da Reserva</Label>
              {hotelForm.voucherUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <a href={hotelForm.voucherUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 hover:underline truncate flex-1">Voucher anexado</a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setHotelForm(f => ({ ...f, voucherUrl: "" }))} className="text-xs text-destructive">Remover</Button>
                </div>
              ) : (
                <FileUpload category="voucher" refId={editingHotel?.id} label="Anexar voucher (PDF, imagem)" accept=".pdf,.jpg,.jpeg,.png" onUploaded={(doc) => setHotelForm(f => ({ ...f, voucherUrl: doc.fileUrl }))} />
              )}
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={hotelForm.observations} onChange={e => setHotelForm(f => ({ ...f, observations: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHotelDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleHotelSubmit} disabled={createRes.isPending || updateRes.isPending}>{editingHotel ? "Salvar" : "Criar Reserva"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flight Dialog */}
      <Dialog open={flightDialogOpen} onOpenChange={o => { setFlightDialogOpen(o); if (!o) resetFlightForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingFlight ? "Editar Passagem Aérea" : "Nova Passagem Aérea"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><Label>Companhia Aérea *</Label><Input value={flightForm.airline} onChange={e => setFlightForm(f => ({ ...f, airline: e.target.value }))} placeholder="LATAM, Gol, Azul..." /></div>
            <div><Label>Número do Voo *</Label><Input value={flightForm.flightNumber} onChange={e => setFlightForm(f => ({ ...f, flightNumber: e.target.value }))} placeholder="LA1234" /></div>
            <div><Label>Aeroporto Origem *</Label><Input value={flightForm.originAirport} onChange={e => setFlightForm(f => ({ ...f, originAirport: e.target.value.toUpperCase() }))} placeholder="GRU" maxLength={5} /></div>
            <div><Label>Aeroporto Destino *</Label><Input value={flightForm.destinationAirport} onChange={e => setFlightForm(f => ({ ...f, destinationAirport: e.target.value.toUpperCase() }))} placeholder="BSB" maxLength={5} /></div>
            <div><Label>Cidade Origem</Label><Input value={flightForm.originCity} onChange={e => setFlightForm(f => ({ ...f, originCity: e.target.value }))} placeholder="São Paulo" /></div>
            <div><Label>Cidade Destino</Label><Input value={flightForm.destinationCity} onChange={e => setFlightForm(f => ({ ...f, destinationCity: e.target.value }))} placeholder="Brasília" /></div>
            <div><Label>Data/Hora Partida *</Label><Input type="datetime-local" value={flightForm.departureDateTime} onChange={e => setFlightForm(f => ({ ...f, departureDateTime: e.target.value }))} /></div>
            <div><Label>Data/Hora Chegada</Label><Input type="datetime-local" value={flightForm.arrivalDateTime} onChange={e => setFlightForm(f => ({ ...f, arrivalDateTime: e.target.value }))} /></div>
            <div><Label>Assento</Label><Input value={flightForm.seat} onChange={e => setFlightForm(f => ({ ...f, seat: e.target.value }))} placeholder="12A" /></div>
            <div><Label>Portão</Label><Input value={flightForm.gate} onChange={e => setFlightForm(f => ({ ...f, gate: e.target.value }))} placeholder="B3" /></div>
            <div><Label>Código de Reserva</Label><Input value={flightForm.bookingCode} onChange={e => setFlightForm(f => ({ ...f, bookingCode: e.target.value }))} placeholder="ABC123" /></div>
            <div><Label>Passageiro</Label><Input value={flightForm.passengerName} onChange={e => setFlightForm(f => ({ ...f, passengerName: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={flightForm.value} onChange={e => setFlightForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={flightForm.status} onValueChange={v => setFlightForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Viagem Associada</Label>
              <Select value={flightForm.tripId} onValueChange={v => setFlightForm(f => ({ ...f, tripId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {trips?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.employeeName} — {format(new Date(t.departureDate), "dd/MM/yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={flightForm.notes} onChange={e => setFlightForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="col-span-2">
              <Label>Voucher do Voo</Label>
              {flightForm.voucherUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <a href={flightForm.voucherUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 hover:underline truncate flex-1">Voucher anexado</a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFlightForm(f => ({ ...f, voucherUrl: "" }))} className="text-xs text-destructive">Remover</Button>
                </div>
              ) : (
                <FileUpload category="passagem" refId={editingFlight?.id} label="Anexar voucher (PDF, imagem)" accept=".pdf,.jpg,.jpeg,.png" onUploaded={(doc) => setFlightForm(f => ({ ...f, voucherUrl: doc.fileUrl }))} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlightDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleFlightSubmit} disabled={createFlight.isPending || updateFlight.isPending}>{editingFlight ? "Salvar" : "Criar Passagem"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
