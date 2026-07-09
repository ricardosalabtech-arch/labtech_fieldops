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
- [x] Adicionar "avião" como meio de transporte no schema (visits, trips)
- [x] Criar tabela flightBookings para dados de voo (companhia, número, origem, destino, embarque, desembarque, assento, voucher)
- [x] Adicionar categoria "passagem" no enum de documents
- [x] Atualizar routers tRPC com novos campos e procedures de flightBookings
- [x] Atualizar página Viagens com formulário de avião e adicionar hospedagem inline
- [x] Atualizar página Reservas para permitir adicionar a partir de viagem
- [x] Atualizar página Documentos com tab de Passagens/Vouchers de Voo
- [x] Gerar e aplicar migration SQL
- [x] Testes vitest para novos fluxos

## Fase 7: Melhorias Adicionais — Waze, Clima e UX
- [x] Criar componente WazeLink para navegação (botão abre Waze com endereço)
- [x] Criar componente WeatherWidget para exibir temperatura do destino
- [x] Atualizar página Viagens com formulário de avião e hospedagem inline
- [x] Adicionar badges de transporte (ícones: carro, bus, app, avião)
- [x] Atualizar página Agendamentos com link Waze e clima
- [x] Atualizar página Reservas com adicionar a partir de viagem
- [x] Atualizar página Documentos com tab Passagens de Voo
- [x] Atualizar Dashboard com indicadores de voos e clima
- [x] Testes vitest para flightBookings

## Fase 8: Agendamento Avançado e Documentos
- [x] Adicionar tipo de visita (preventiva, corretiva, consultoria, treinamento) ao schema
- [x] Adicionar data de início e fim ao schema de visitas
- [x] Adicionar campo de viagem vinculada e técnico responsável na visita
- [x] Implementar notificação ao cliente, especialista e técnico ao agendar
- [x] Corrigir upload de passagem aérea (voucher de voo) em Documentos
- [x] Corrigir upload de voucher de hotel em Documentos
- [x] Permitir upload de documentos para acesso do técnico/especialista
- [x] Atualizar página Agendamentos com novos campos
- [x] Gerar e aplicar migration SQL

## Fase 9: Melhorias de Gestão
- [x] Checklist de visita por tipo (manutenção, instalação, inspeção)
- [x] Controle de equipamentos levados/devolvidos
- [x] Aprovação de despesas com upload de recibo
- [x] Otimização de rota entre visitas do dia (Waze links por visita)
- [x] Integração Google Calendar

## Fase 10: Melhorias de Experiência
- [x] Modo escuro (dark/light toggle)
- [x] Dashboard com gráficos (visitas/mês, custos/categoria, taxa conclusão)
- [x] Busca global (visitas, clientes, viagens, documentos)
- [x] Histórico de alterações (audit log)

## Fase 11: Melhorias Técnicas
- [x] PWA (instalação no celular, offline)
- [x] Geolocalização do técnico na visita (persistente no backend)
- [x] API para integração externa (tRPC procedures expostas)

## Fase 8.1: Correções de Integração
- [x] Vincular uploads de passagem aos registros de flightBookings (upload direto no card do voo)
- [x] Vincular uploads de voucher às hotelReservations (upload direto no card da reserva)
- [x] Exibir documentos vinculados nas telas de visita/viagem/cliente para técnico/especialista
- [x] Implementar envio real de notificações (in-app toast + owner notification) ao agendar visita

## Fase 12: Controle por Perfis (Admin / Técnico / Especialista)
- [x] Adicionar role "tecnico" e "especialista" ao enum de users no schema
- [x] Garantir que técnicos vejam apenas suas visitas/viagens/despesas
- [x] Admin: bloquear criação/edição para técnicos em Clientes, Agendamentos, Configurações
- [x] Admin: botão "Acionar Técnico" ao agendar visita (notifica técnico designado)
- [x] Admin: painel de monitoramento de localização do técnico/especialista
- [x] Admin: aprovação de gastos restrita ao perfil admin
- [x] Admin: envio/disponibilização de documentos para técnico/especialista
- [x] Técnico/Especialista: receber e visualizar documentos enviados
- [x] Técnico/Especialista: organizar viagem (criar/editar viagens e reservas vinculadas)
- [x] Técnico/Especialista: inserir custos e vincular à viagem em aberto
- [x] Técnico/Especialista: registrar geolocalização na visita
- [x] Atualizar DashboardLayout para mostrar navegação condicional por perfil
- [x] Gerar e aplicar migration SQL
- [x] Testes vitest para controle de acesso por perfil

## Fase 13: Login com E-mail e Senha
- [x] Adicionar campos email e passwordHash à tabela employees no schema
- [x] Criar procedure de login com e-mail e senha (gerar sessão JWT)
- [x] Criar procedure de cadastro de técnico/especialista com credenciais (admin apenas)
- [x] Criar página de login com e-mail e senha
- [x] Integrar login por e-mail/senha com o fluxo de autenticação existente (OAuth para admin)
- [x] Permitir que admin cadastre técnico/especialista com e-mail e senha em Configurações
- [x] Gerar e aplicar migration SQL
- [x] Testes vitest para login com e-mail e senha

## Fase 14: Foto e Documentos para Técnicos
- [x] Adicionar upload de foto no formulário de funcionário em Configurações
- [x] Exibir foto do especialista/técnico nos cards de funcionários
- [x] Garantir que documentos anexados pelo admin sejam visíveis para técnico/especialista
- [ ] Adicionar seção "Meus Documentos" na view do técnico/especialista
- [x] Testes vitest para login com senha e visibilidade de documentos

## Fase 15: Meus Documentos e Kanban
- [x] Adicionar seção "Meus Documentos" no Dashboard para técnicos/especialistas
- [x] Adicionar view Kanban no Agendamentos (quadro de cartões por status)
- [x] Permitir alternar entre Calendário e Kanban no Agendamentos
- [x] Testes vitest para as novas views

## Fase 16: Polimento Geral
- [ ] Salvar checkpoint intermediário (Meus Documentos + Kanban)
- [ ] Adicionar confirmação de exclusão (AlertDialog) em todas as operações de delete
- [ ] Melhorar responsividade mobile (sidebar colapsável, tabelas com scroll horizontal)
- [ ] Adicionar estados de carregamento (skeletons/spinners) em todas as páginas
- [ ] Validar formulários com mensagens de erro claras
- [ ] Melhorar Dashboard com skeletons durante carregamento
- [ ] Adicionar empty states com ilustrações em todas as listas
- [ ] Melhorar acessibilidade (aria-labels, focus rings, navegação por teclado)
- [ ] Otimizar performance (useMemo em listas grandes, debounce em buscas)
- [ ] Testes vitest para os novos componentes de UI
