import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Plus, Car, User, FileText, Trash2, Pencil, FileCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FileUpload from "@/components/FileUpload";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Documentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("veiculos");
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [driverDialog, setDriverDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: vehicles, isLoading: vehiclesLoading } = trpc.vehicles.list.useQuery();
  const { data: drivers, isLoading: driversLoading } = trpc.drivers.list.useQuery();
  const { data: documents, isLoading: docsLoading } = trpc.documents.list.useQuery();

  // Vehicles
  const createVehicle = trpc.vehicles.create.useMutation({
    onSuccess: (v) => { utils.vehicles.list.invalidate(); toast.success("Veículo cadastrado! Agora você pode anexar documentos."); setEditingVehicle(v); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateVehicle = trpc.vehicles.update.useMutation({
    onSuccess: () => { utils.vehicles.list.invalidate(); toast.success("Veículo atualizado!"); setVehicleDialog(false); resetVehicleForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteVehicle = trpc.vehicles.delete.useMutation({
    onSuccess: () => { utils.vehicles.list.invalidate(); toast.success("Veículo removido"); },
  });

  // Drivers
  const createDriver = trpc.drivers.create.useMutation({
    onSuccess: (d) => { utils.drivers.list.invalidate(); toast.success("Condutor cadastrado! Agora você pode anexar documentos."); setEditingDriver(d); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const updateDriver = trpc.drivers.update.useMutation({
    onSuccess: () => { utils.drivers.list.invalidate(); toast.success("Condutor atualizado!"); setDriverDialog(false); resetDriverForm(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteDriver = trpc.drivers.delete.useMutation({
    onSuccess: () => { utils.drivers.list.invalidate(); toast.success("Condutor removido"); },
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Documento removido"); },
  });

  const [vForm, setVForm] = useState({ plate: "", year: "", model: "", color: "", crlvExpiry: "", insuranceExpiry: "", inspectionExpiry: "" });
  const [dForm, setDForm] = useState({ fullName: "", cpf: "", cnhNumber: "", cnhCategory: "", cnhExpiry: "", bloodType: "", address: "", email: "" });

  function resetVehicleForm() { setVForm({ plate: "", year: "", model: "", color: "", crlvExpiry: "", insuranceExpiry: "", inspectionExpiry: "" }); setEditingVehicle(null); }
  function resetDriverForm() { setDForm({ fullName: "", cpf: "", cnhNumber: "", cnhCategory: "", cnhExpiry: "", bloodType: "", address: "", email: "" }); setEditingDriver(null); }

  function openEditVehicle(v: any) {
    setEditingVehicle(v);
    setVForm({
      plate: v.plate || "", year: v.year || "", model: v.model || "", color: v.color || "",
      crlvExpiry: v.crlvExpiry ? format(new Date(v.crlvExpiry), "yyyy-MM-dd") : "",
      insuranceExpiry: v.insuranceExpiry ? format(new Date(v.insuranceExpiry), "yyyy-MM-dd") : "",
      inspectionExpiry: v.inspectionExpiry ? format(new Date(v.inspectionExpiry), "yyyy-MM-dd") : "",
    });
    setVehicleDialog(true);
  }

  function openEditDriver(d: any) {
    setEditingDriver(d);
    setDForm({
      fullName: d.fullName || "", cpf: d.cpf || "", cnhNumber: d.cnhNumber || "",
      cnhCategory: d.cnhCategory || "", cnhExpiry: d.cnhExpiry ? format(new Date(d.cnhExpiry), "yyyy-MM-dd") : "",
      bloodType: d.bloodType || "", address: d.address || "", email: d.email || "",
    });
    setDriverDialog(true);
  }

  function handleVehicleSubmit() {
    if (!vForm.plate || !vForm.model) { toast.error("Placa e modelo são obrigatórios"); return; }
    const data: any = {
      plate: vForm.plate, model: vForm.model, year: vForm.year || undefined, color: vForm.color || undefined,
      crlvExpiry: vForm.crlvExpiry ? new Date(vForm.crlvExpiry + "T00:00:00").getTime() : undefined,
      insuranceExpiry: vForm.insuranceExpiry ? new Date(vForm.insuranceExpiry + "T00:00:00").getTime() : undefined,
      inspectionExpiry: vForm.inspectionExpiry ? new Date(vForm.inspectionExpiry + "T00:00:00").getTime() : undefined,
    };
    if (editingVehicle) updateVehicle.mutate({ id: editingVehicle.id, ...data });
    else createVehicle.mutate(data);
  }

  function handleDriverSubmit() {
    if (!dForm.fullName) { toast.error("Nome é obrigatório"); return; }
    const data: any = {
      fullName: dForm.fullName, cpf: dForm.cpf || undefined, cnhNumber: dForm.cnhNumber || undefined,
      cnhCategory: dForm.cnhCategory || undefined, bloodType: dForm.bloodType || undefined,
      address: dForm.address || undefined, email: dForm.email || undefined,
      cnhExpiry: dForm.cnhExpiry ? new Date(dForm.cnhExpiry + "T00:00:00").getTime() : undefined,
    };
    if (editingDriver) updateDriver.mutate({ id: editingDriver.id, ...data });
    else createDriver.mutate(data);
  }

  const veiculoDocs = (vid?: number) => documents?.filter(d => d.category === "veiculo" && d.refId === vid) || [];
  const condutorDocs = (did?: number) => documents?.filter(d => d.category === "condutor" && d.refId === did) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.02_250)]">Documentos</h1>
        <p className="text-sm text-muted-foreground">Veículos e Condutores</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="veiculos" className="gap-1.5"><Car className="h-4 w-4" /> Veículos</TabsTrigger>
          <TabsTrigger value="condutores" className="gap-1.5"><User className="h-4 w-4" /> Condutores</TabsTrigger>
        </TabsList>

        {/* Veículos */}
        <TabsContent value="veiculos" className="space-y-4">
          <div className="flex justify-end">
            {isAdmin && <Button onClick={() => { resetVehicleForm(); setVehicleDialog(true); }} className="gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Novo Veículo
            </Button>}
          </div>
          {vehiclesLoading ? (
            <LoadingSkeleton type="card" count={3} />
          ) : !vehicles || vehicles.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent>
              <EmptyState icon={Car} title="Nenhum veículo cadastrado" description="Cadastre veículos para uso nas viagens técnicas. Após cadastrar, você poderá anexar CRLV, seguro e outros documentos ao card do veículo." />
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(v => (
                <Card key={v.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Car className="h-5 w-5 text-blue-600" /></div>
                      <div><CardTitle className="text-sm font-semibold">{v.model}</CardTitle><p className="text-xs text-muted-foreground font-mono">{v.plate}</p></div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {v.year && <p>Ano: {v.year}</p>}
                    {v.color && <p>Cor: {v.color}</p>}
                    {v.crlvExpiry && <p className={new Date(v.crlvExpiry) < new Date() ? "text-red-600 font-medium" : ""}>CRLV: {format(new Date(v.crlvExpiry), "dd/MM/yyyy", { locale: ptBR })}</p>}
                    {v.insuranceExpiry && <p className={new Date(v.insuranceExpiry) < new Date() ? "text-red-600 font-medium" : ""}>Seguro: {format(new Date(v.insuranceExpiry), "dd/MM/yyyy", { locale: ptBR })}</p>}
                    {/* Documentos anexados */}
                    {veiculoDocs(v.id).length > 0 && (
                      <div className="space-y-1 pt-2">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1"><FileCheck className="h-3 w-3" /> Documentos anexados:</p>
                        {veiculoDocs(v.id).map(doc => (
                          <div key={doc.id} className="flex items-center gap-1.5">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">{doc.name}</a>
                            <a href={doc.fileUrl} download className="text-muted-foreground hover:text-primary" aria-label="Baixar {doc.name}"><Download className="h-3 w-3" /></a>
                            <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-5 w-5 p-0 text-destructive"><Trash2 className="h-2.5 w-2.5" /></Button>} title="Remover documento?" description={`Remover ${doc.name}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteDoc.mutate({ id: doc.id })} />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Upload de documento */}
                    {isAdmin && <div className="pt-2">
                      <FileUpload category="veiculo" refId={v.id} label="Anexar CRLV, seguro, etc." accept=".pdf,.jpg,.jpeg,.png" />
                    </div>}
                    {isAdmin && <div className="flex gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => openEditVehicle(v)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                      <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover veículo?" description={`Remover ${v.model} (${v.plate})? Esta ação não pode ser desfeita.`} onConfirm={() => deleteVehicle.mutate({ id: v.id })} />
                    </div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Condutores */}
        <TabsContent value="condutores" className="space-y-4">
          <div className="flex justify-end">
            {isAdmin && <Button onClick={() => { resetDriverForm(); setDriverDialog(true); }} className="gap-2 rounded-lg">
              <Plus className="h-4 w-4" /> Novo Condutor
            </Button>}
          </div>
          {driversLoading ? (
            <LoadingSkeleton type="card" count={3} />
          ) : !drivers || drivers.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent>
              <EmptyState icon={User} title="Nenhum condutor cadastrado" description="Cadastre condutores para uso nas viagens técnicas. Após cadastrar, você poderá anexar CNH, exame médico e outros documentos ao card do condutor." />
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map(d => (
                <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center"><User className="h-5 w-5 text-indigo-600" /></div>
                      <div><CardTitle className="text-sm font-semibold">{d.fullName}</CardTitle><p className="text-xs text-muted-foreground">CNH: {d.cnhCategory || "—"}</p></div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {d.cpf && <p>CPF: {d.cpf}</p>}
                    {d.cnhNumber && <p>CNH: {d.cnhNumber}</p>}
                    {d.cnhExpiry && <p className={new Date(d.cnhExpiry) < new Date() ? "text-red-600 font-medium" : ""}>Validade CNH: {format(new Date(d.cnhExpiry), "dd/MM/yyyy", { locale: ptBR })}</p>}
                    {d.bloodType && <p>Tipo Sanguíneo: {d.bloodType}</p>}
                    {d.email && <p>{d.email}</p>}
                    {/* Documentos anexados */}
                    {condutorDocs(d.id).length > 0 && (
                      <div className="space-y-1 pt-2">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1"><FileCheck className="h-3 w-3" /> Documentos anexados:</p>
                        {condutorDocs(d.id).map(doc => (
                          <div key={doc.id} className="flex items-center gap-1.5">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">{doc.name}</a>
                            <a href={doc.fileUrl} download className="text-muted-foreground hover:text-primary" aria-label="Baixar {doc.name}"><Download className="h-3 w-3" /></a>
                            <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-5 w-5 p-0 text-destructive"><Trash2 className="h-2.5 w-2.5" /></Button>} title="Remover documento?" description={`Remover ${doc.name}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteDoc.mutate({ id: doc.id })} />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Upload de documento */}
                    {isAdmin && <div className="pt-2">
                      <FileUpload category="condutor" refId={d.id} label="Anexar CNH, exame, etc." accept=".pdf,.jpg,.jpeg,.png" />
                    </div>}
                    {isAdmin && <div className="flex gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => openEditDriver(d)} className="gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                      <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>} title="Remover condutor?" description={`Remover ${d.fullName}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteDriver.mutate({ id: d.id })} />
                    </div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* Dialog Veículo */}
      <Dialog open={vehicleDialog} onOpenChange={o => { setVehicleDialog(o); if (!o) resetVehicleForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingVehicle ? "Editar Veículo" : "Novo Veículo"}</DialogTitle></DialogHeader>
          {editingVehicle && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
              <FileCheck className="h-4 w-4" />
              <span>Veículo cadastrado! Anexe os documentos abaixo.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><Label>Placa *</Label><Input value={vForm.plate} onChange={e => setVForm(f => ({ ...f, plate: e.target.value }))} /></div>
            <div><Label>Modelo *</Label><Input value={vForm.model} onChange={e => setVForm(f => ({ ...f, model: e.target.value }))} /></div>
            <div><Label>Ano</Label><Input value={vForm.year} onChange={e => setVForm(f => ({ ...f, year: e.target.value }))} maxLength={4} /></div>
            <div><Label>Cor</Label><Input value={vForm.color} onChange={e => setVForm(f => ({ ...f, color: e.target.value }))} /></div>
            <div><Label>Vencimento CRLV</Label><Input type="date" value={vForm.crlvExpiry} onChange={e => setVForm(f => ({ ...f, crlvExpiry: e.target.value }))} /></div>
            <div><Label>Vencimento Seguro</Label><Input type="date" value={vForm.insuranceExpiry} onChange={e => setVForm(f => ({ ...f, insuranceExpiry: e.target.value }))} /></div>
            <div><Label>Vencimento Inspeção</Label><Input type="date" value={vForm.inspectionExpiry} onChange={e => setVForm(f => ({ ...f, inspectionExpiry: e.target.value }))} /></div>
          </div>
          {editingVehicle && (
            <div className="space-y-3 py-2 border-t mt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><FileCheck className="h-4 w-4" /> Documentos Anexados</div>
              {veiculoDocs(editingVehicle.id).length > 0 ? (
                <div className="space-y-2">
                  {veiculoDocs(editingVehicle.id).map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">{doc.name}</a>
                      <a href={doc.fileUrl} download className="text-muted-foreground hover:text-primary" aria-label="Baixar"><Download className="h-4 w-4" /></a>
                      <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-5 w-5 p-0 text-destructive"><Trash2 className="h-2.5 w-2.5" /></Button>} title="Remover documento?" description={`Remover ${doc.name}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteDoc.mutate({ id: doc.id })} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum documento anexado ainda.</p>
              )}
              <FileUpload category="veiculo" refId={editingVehicle.id} label="Anexar CRLV, seguro, etc." accept=".pdf,.jpg,.jpeg,.png" />
            </div>
          )}
          {!editingVehicle && (
            <p className="text-xs text-muted-foreground py-2 border-t mt-2">Após cadastrar o veículo, você poderá anexar documentos (CRLV, seguro, etc.) no card ou ao editar.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialog(false)}>Cancelar</Button>
            <Button onClick={handleVehicleSubmit} disabled={createVehicle.isPending || updateVehicle.isPending}>{editingVehicle ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Condutor */}
      <Dialog open={driverDialog} onOpenChange={o => { setDriverDialog(o); if (!o) resetDriverForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDriver ? "Editar Condutor" : "Novo Condutor"}</DialogTitle></DialogHeader>
          {editingDriver && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
              <FileCheck className="h-4 w-4" />
              <span>Condutor cadastrado! Anexe os documentos abaixo.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><Label>Nome Completo *</Label><Input value={dForm.fullName} onChange={e => setDForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div><Label>CPF</Label><Input value={dForm.cpf} onChange={e => setDForm(f => ({ ...f, cpf: e.target.value }))} /></div>
            <div><Label>CNH Número</Label><Input value={dForm.cnhNumber} onChange={e => setDForm(f => ({ ...f, cnhNumber: e.target.value }))} /></div>
            <div><Label>Categoria CNH</Label><Input value={dForm.cnhCategory} onChange={e => setDForm(f => ({ ...f, cnhCategory: e.target.value }))} maxLength={4} /></div>
            <div><Label>Validade CNH</Label><Input type="date" value={dForm.cnhExpiry} onChange={e => setDForm(f => ({ ...f, cnhExpiry: e.target.value }))} /></div>
            <div><Label>Tipo Sanguíneo</Label><Input value={dForm.bloodType} onChange={e => setDForm(f => ({ ...f, bloodType: e.target.value }))} maxLength={5} /></div>
            <div><Label>Email</Label><Input type="email" value={dForm.email} onChange={e => setDForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Endereço</Label><Input value={dForm.address} onChange={e => setDForm(f => ({ ...f, address: e.target.value }))} /></div>
          </div>
          {editingDriver && (
            <div className="space-y-3 py-2 border-t mt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><FileCheck className="h-4 w-4" /> Documentos Anexados</div>
              {condutorDocs(editingDriver.id).length > 0 ? (
                <div className="space-y-2">
                  {condutorDocs(editingDriver.id).map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">{doc.name}</a>
                      <a href={doc.fileUrl} download className="text-muted-foreground hover:text-primary" aria-label="Baixar"><Download className="h-4 w-4" /></a>
                      <ConfirmDialog trigger={<Button variant="ghost" size="sm" aria-label="Excluir" className="h-5 w-5 p-0 text-destructive"><Trash2 className="h-2.5 w-2.5" /></Button>} title="Remover documento?" description={`Remover ${doc.name}? Esta ação não pode ser desfeita.`} onConfirm={() => deleteDoc.mutate({ id: doc.id })} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum documento anexado ainda.</p>
              )}
              <FileUpload category="condutor" refId={editingDriver.id} label="Anexar CNH, exame médico, etc." accept=".pdf,.jpg,.jpeg,.png" />
            </div>
          )}
          {!editingDriver && (
            <p className="text-xs text-muted-foreground py-2 border-t mt-2">Após cadastrar o condutor, você poderá anexar documentos (CNH, exame médico, etc.) no card ou ao editar.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriverDialog(false)}>Cancelar</Button>
            <Button onClick={handleDriverSubmit} disabled={createDriver.isPending || updateDriver.isPending}>{editingDriver ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
