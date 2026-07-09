# API de Integração Externa — SA Labtech FieldOps

O SA Labtech FieldOps expõe todos os endpoints via tRPC sob `/api/trpc`. Para integração com sistemas externos (ERP, CRM, etc.), utilize os procedures abaixo com autenticação via cookie de sessão OAuth.

## Autenticação

Todas as requisições devem incluir o cookie de sessão obtido via fluxo OAuth Manus. Para integrações server-to-server, contate o administrador para obter credenciais de acesso.

## Endpoints Disponíveis

### Visitas
| Procedure | Método | Descrição |
|---|---|---|
| `visits.list` | Query | Lista visitas (filtros: status, employeeId) |
| `visits.create` | Mutation | Cria nova visita (admin apenas) |
| `visits.update` | Mutation | Atualiza visita |
| `visits.delete` | Mutation | Exclui visita (admin apenas) |
| `visits.saveGeo` | Mutation | Registra geolocalização do técnico |

### Clientes
| Procedure | Método | Descrição |
|---|---|---|
| `clients.list` | Query | Lista clientes |
| `clients.create` | Mutation | Cadastra cliente (admin apenas) |
| `clients.update` | Mutation | Atualiza cliente (admin apenas) |
| `clients.delete` | Mutation | Exclui cliente (admin apenas) |

### Viagens
| Procedure | Método | Descrição |
|---|---|---|
| `trips.list` | Query | Lista viagens |
| `trips.create` | Mutation | Cria viagem |
| `trips.update` | Mutation | Atualiza viagem |
| `trips.delete` | Mutation | Exclui viagem (admin apenas) |

### Reservas de Hotel
| Procedure | Método | Descrição |
|---|---|---|
| `hotelReservations.list` | Query | Lista reservas |
| `hotelReservations.create` | Mutation | Cria reserva |
| `hotelReservations.update` | Mutation | Atualiza reserva |
| `hotelReservations.delete` | Mutation | Exclui reserva (admin apenas) |

### Voos (flightBookings)
| Procedure | Método | Descrição |
|---|---|---|
| `flightBookings.list` | Query | Lista voos |
| `flightBookings.create` | Mutation | Cria reserva de voo |
| `flightBookings.update` | Mutation | Atualiza voo |
| `flightBookings.delete` | Mutation | Exclui voo (admin apenas) |

### Despesas
| Procedure | Método | Descrição |
|---|---|---|
| `expenses.list` | Query | Lista despesas (filtros: status, employeeId) |
| `expenses.create` | Mutation | Registra despesa |
| `expenses.update` | Mutation | Atualiza/Aprova despesa (admin apenas para aprovação) |
| `expenses.delete` | Mutation | Exclui despesa (admin apenas) |
| `expenses.summary` | Query | Resumo de despesas por categoria |
| `expenses.byEmployee` | Query | Despesas agrupadas por funcionário |

### Documentos
| Procedure | Método | Descrição |
|---|---|---|
| `documents.list` | Query | Lista documentos (filtros: category, refId) |
| `documents.create` | Mutation | Upload de documento (base64 → S3) |
| `documents.delete` | Mutation | Exclui documento (admin apenas) |

### Dashboard
| Procedure | Método | Descrição |
|---|---|---|
| `dashboard.stats` | Query | Estatísticas gerais do sistema |

### Funcionários
| Procedure | Método | Descrição |
|---|---|---|
| `employees.list` | Query | Lista funcionários |
| `employees.create` | Mutation | Cadastra funcionário (admin apenas) |
| `employees.update` | Mutation | Atualiza funcionário (admin apenas) |
| `employees.delete` | Mutation | Exclui funcionário (admin apenas) |

### Checklist e Equipamentos
| Procedure | Método | Descrição |
|---|---|---|
| `checklists.list` | Query | Lista checklists por visita |
| `checklists.create` | Mutation | Cria checklist |
| `visitEquipment.list` | Query | Lista equipamentos por visita |
| `visitEquipment.create` | Mutation | Registra equipamento |

### Auditoria
| Procedure | Método | Descrição |
|---|---|---|
| `auditLog.list` | Query | Histórico de alterações |

## Controle de Acesso

| Perfil | Permissões |
|---|---|
| **admin** | Acesso total: criar, editar, excluir, aprovar despesas, gerenciar funcionários |
| **tecnico** | Visualizar suas visitas/viagens/despesas, criar/editar viagens e despesas, registrar geolocalização |
| **especialista** | Mesmas permissões que técnico |

## Formato de Requisição

```
POST /api/trpc
Content-Type: application/json

{
  "visits.list": {
    "0": { "status": "agendado" }
  }
}
```

## Formato de Resposta

```json
{
  "visits.list": {
    "result": {
      "data": [{ "id": 1, "clientName": "..." }]
    }
  }
}
```
