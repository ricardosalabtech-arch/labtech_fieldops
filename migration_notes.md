# Notas de Migração: Viagens → Agenda

## Objetivo
Migrar toda a funcionalidade de Viagens.tsx para a aba "Viagem" da página Agendamentos.tsx.
Remover o menu "Viagens" do DashboardLayout e a rota /viagens do App.tsx.

## Sobre salabtech.com
O site https://www.salabtech.com é um "App de Serviço" com login por Manus OAuth ou Email/Senha.
É um aplicativo separado, não expõe API pública de agenda.
**Sincronização não é viável** sem acesso à API interna do salabtech.com.
Alternativa: exportar/importar via iCal (.ics) ou criar um webhook compartilhado entre os dois sistemas.

## Estado atual da aba Viagem em Agendamentos.tsx
- Apenas lista simples de viagens (linhas 525-595)
- Sem CRUD, sem expansão, sem checklist, sem hotel/voo

## O que precisa ser migrado de Viagens.tsx para Agendamentos.tsx
1. Imports: Car, Plane, Hotel, Navigation, ChevronDown, ClipboardCheck, CheckCircle2, Circle, TransportBadge, PainelViagem, PeriodFilter, filterByPeriod
2. States: dialogOpen(trip), editingTrip, expandedTrip, period, customRange, hotelDialogOpen, hotelForTrip, flightDialogOpen, flightForTrip
3. Queries: hotelReservations, flights, checklists, expenses (trips e employees já existem)
4. Mutations: createTrip, updateTrip, deleteTrip, createHotel, createFlight, deleteFlight, updateFlightVoucher, createChecklist(vehicle), updateChecklist
5. Forms: form(trip), hotelForm, flightForm + reset functions
6. Helpers: resetForm(trip), openNew, openEdit, handleSubmit(trip), handleHotelSubmit, handleFlightSubmit, filteredTrips(PeriodFilter), tripsByStatus, getTripHotels, getTripFlights, getTripVisit, vehicleChecklistItems, getTripChecklist, parseChecklistItems, toggleChecklistItem, initChecklist
7. JSX: lista expandível de viagens com PainelViagem + weather + voos + hotéis + visita + checklist
8. Dialogs: Trip Dialog, Hotel Dialog, Flight Dialog

## Arquivos a atualizar depois
- DashboardLayout.tsx: remover item "Viagens" do menu
- App.tsx: remover rota /viagens, redirecionar para /agendamentos
- Dashboard.tsx: atualizar links de "Nova Viagem" e "Próximos Voos" para /agendamentos?tab=viagem
