# Project TODO — SA Labtech FieldOps

## Fase 1: Infraestrutura e Banco de Dados
- [x] Inicializar projeto web com autenticação e banco de dados
- [x] Definir schema do banco de dados (clientes, visitas, viagens, reservas, documentos, custos, veículos, condutores, funcionários)
- [x] Gerar e aplicar migration SQL
- [x] Criar query helpers no server/db.ts

## Fase 2: Backend tRPC
- [x] Criar routers para Clientes (CRUD + listagem com busca)
- [x] Criar routers para Visitas Técnicas (CRUD + listagem + filtros)
- [x] Criar routers para Viagens (CRUD + kanban por status)
- [x] Criar routers para Reservas de Hotel (CRUD + listagem)
- [x] Criar routers para Documentos (veículos, condutores, vouchers — CRUD + upload)
- [x] Criar routers para Revisão de Custos (CRUD + aprovação + totais por funcionário)
- [x] Criar routers para Relatórios (consolidado por período)
- [x] Criar router para Dashboard (resumo de visitas, pendentes, concluídas, custos, clientes, reservas)
- [x] Criar routers para Veículos e Condutores (CRUD completo)
- [x] Implementar controle de acesso (admin vs técnico)

## Fase 3: Frontend — Layout e Navegação
- [x] Configurar tema visual (azul SA Labtech, tipografia, espaçamento)
- [x] Customizar DashboardLayout com sidebar de navegação
- [x] Configurar rotas no App.tsx

## Fase 4: Frontend — Páginas dos Módulos
- [x] Dashboard com cards de resumo e ações rápidas
- [x] Agendamentos com calendário mensal/semanal + filtros
- [x] Visitas Técnicas com formulário completo e listagem (integrado em Agendamentos)
- [x] Clientes com cadastro, busca e histórico
- [x] Viagens com kanban e formulário detalhado
- [x] Reservas de Hotel com formulário e listagem
- [x] Documentos com tabs (Veículos, Condutores, Vouchers)
- [x] Revisão de Custos com cards de totais, filtro por funcionário e viagem
- [x] Relatórios com visão consolidada filtrada por período
- [x] Configurações com perfil e gestão de equipe (admin)

## Fase 5: Testes e Entrega
- [x] Escrever testes vitest para procedures principais (8 testes, todos passando)
- [x] Verificar status do projeto
- [x] Salvar checkpoint e entregar ao usuário

## Fase 6: Melhorias — Viagem de Avião, Voucher de Voo e Hospedagem
- [ ] Adicionar "avião" como meio de transporte no schema (visits, trips)
- [ ] Criar tabela flightBookings para dados de voo (companhia, número, origem, destino, embarque, desembarque, assento, voucher)
- [ ] Adicionar categoria "passagem" no enum de documents
- [ ] Atualizar routers tRPC com novos campos e procedures de flightBookings
- [ ] Atualizar página Viagens com formulário de avião e adicionar hospedagem inline
- [ ] Atualizar página Reservas para permitir adicionar a partir de viagem
- [ ] Atualizar página Documentos com tab de Passagens/Vouchers de Voo
- [ ] Gerar e aplicar migration SQL
- [ ] Testes vitest para novos fluxos

## Fase 7: Melhorias Adicionais — Waze, Clima e UX
- [ ] Criar componente WazeLink para navegação (botão abre Waze com endereço)
- [ ] Criar componente WeatherWidget para exibir temperatura do destino
- [ ] Atualizar página Viagens com formulário de avião e hospedagem inline
- [ ] Adicionar badges de transporte (ícones: carro, bus, app, avião)
- [ ] Atualizar página Agendamentos com link Waze e clima
- [ ] Atualizar página Reservas com adicionar a partir de viagem
- [ ] Atualizar página Documentos com tab Passagens de Voo
- [ ] Atualizar Dashboard com indicadores de voos e clima
- [ ] Testes vitest para flightBookings
