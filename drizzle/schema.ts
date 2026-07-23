import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "tecnico", "especialista"]).default("user").notNull(), // Migration: ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','tecnico','especialista') NOT NULL DEFAULT 'user';
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clientes ───────────────────────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  zipCode: varchar("zipCode", { length: 10 }),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 4 }),
  responsibleName: varchar("responsibleName", { length: 255 }).notNull(),
  responsibleEmail: varchar("responsibleEmail", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Funcionários (Técnicos/Especialistas) ──────────────────
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  zipCode: varchar("zipCode", { length: 10 }),
  role: mysqlEnum("role", ["tecnico", "especialista", "administrador"]).default("tecnico").notNull(),
  position: varchar("position", { length: 255 }),
  department: varchar("department", { length: 255 }),
  hireDate: timestamp("hireDate"),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  photoUrl: text("photoUrl"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ─── Visitas Técnicas ───────────────────────────────────────
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 4 }),
  visitDate: timestamp("visitDate").notNull(),
  endDate: timestamp("endDate"),
  scheduledTime: varchar("scheduledTime", { length: 10 }),
  visitType: mysqlEnum("visitType", ["manutencao_preventiva", "manutencao_corretiva", "consultoria", "treinamento"]).default("manutencao_preventiva").notNull(),
  employeeId: int("employeeId"),
  employeeName: varchar("employeeName", { length: 255 }),
  tripId: int("tripId"),
  status: mysqlEnum("status", ["agendado", "em_andamento", "concluido", "cancelado"]).default("agendado").notNull(),
  transportMode: mysqlEnum("transportMode", ["carro_empresa", "transporte_publico", "app", "aviao"]),
  description: text("description"),
  notes: text("notes"),
  clientNotified: int("clientNotified").default(0),
  specialistNotified: int("specialistNotified").default(0),
  technicianNotified: int("technicianNotified").default(0),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  geoTimestamp: timestamp("geoTimestamp"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

// ─── Viagens ────────────────────────────────────────────────
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId"),
  employeeId: int("employeeId"),
  employeeName: varchar("employeeName", { length: 255 }),
  transportMode: mysqlEnum("transportMode", ["carro_empresa", "transporte_publico", "app", "aviao"]).default("carro_empresa").notNull(),
  vehicleInfo: varchar("vehicleInfo", { length: 255 }),
  departureDate: timestamp("departureDate").notNull(),
  returnDate: timestamp("returnDate"),
  returnAddress: text("returnAddress"),
  status: mysqlEnum("status", ["planejada", "em_andamento", "concluida", "cancelada"]).default("planejada").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// ─── Reservas de Hotel ──────────────────────────────────────
export const hotelReservations = mysqlTable("hotelReservations", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId"),
  visitId: int("visitId"),
  hotelName: varchar("hotelName", { length: 255 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  checkIn: timestamp("checkIn").notNull(),
  checkOut: timestamp("checkOut").notNull(),
  confirmationNumber: varchar("confirmationNumber", { length: 100 }),
  value: decimal("value", { precision: 10, scale: 2 }).default("0.00").notNull(),
  observations: text("observations"),
  status: mysqlEnum("status", ["confirmada", "pendente", "cancelada"]).default("pendente").notNull(),
  voucherUrl: text("voucherUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HotelReservation = typeof hotelReservations.$inferSelect;
export type InsertHotelReservation = typeof hotelReservations.$inferInsert;

// ─── Documentos ─────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["veiculo", "condutor", "voucher", "passagem", "visita", "cliente", "despesa"]).notNull(),
  refId: int("refId"),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  uploadedBy: varchar("uploadedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Veículos ───────────────────────────────────────────────
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  plate: varchar("plate", { length: 20 }).notNull(),
  year: varchar("year", { length: 4 }),
  model: varchar("model", { length: 255 }).notNull(),
  color: varchar("color", { length: 60 }),
  crlvExpiry: timestamp("crlvExpiry"),
  insuranceExpiry: timestamp("insuranceExpiry"),
  inspectionExpiry: timestamp("inspectionExpiry"),
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

// ─── Condutores ─────────────────────────────────────────────
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId"),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 20 }),
  cnhNumber: varchar("cnhNumber", { length: 20 }),
  cnhCategory: varchar("cnhCategory", { length: 4 }),
  cnhExpiry: timestamp("cnhExpiry"),
  bloodType: varchar("bloodType", { length: 5 }),
  zipCode: varchar("zipCode", { length: 10 }),
  address: text("address"),
  email: varchar("email", { length: 320 }),
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// ─── Revisão de Custos ──────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId"),
  visitId: int("visitId"),
  employeeId: int("employeeId"),
  employeeName: varchar("employeeName", { length: 255 }),
  category: mysqlEnum("category", ["transporte", "hospedagem", "alimentacao", "outros"]).notNull(),
  description: varchar("description", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pendente", "aprovado", "rejeitado"]).default("pendente").notNull(),
  receiptUrl: text("receiptUrl"),
  receiptKey: text("receiptKey"),
  approvedBy: varchar("approvedBy", { length: 255 }),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Passagens de Avião (Voo) ───────────────────────────────
export const flightBookings = mysqlTable("flightBookings", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId"),
  visitId: int("visitId"),
  employeeId: int("employeeId"),
  employeeName: varchar("employeeName", { length: 255 }),
  airline: varchar("airline", { length: 255 }).notNull(),
  flightNumber: varchar("flightNumber", { length: 50 }).notNull(),
  originAirport: varchar("originAirport", { length: 10 }).notNull(),
  destinationAirport: varchar("destinationAirport", { length: 10 }).notNull(),
  originCity: varchar("originCity", { length: 120 }),
  destinationCity: varchar("destinationCity", { length: 120 }),
  departureDateTime: timestamp("departureDateTime").notNull(),
  arrivalDateTime: timestamp("arrivalDateTime"),
  seat: varchar("seat", { length: 10 }),
  gate: varchar("gate", { length: 10 }),
  bookingCode: varchar("bookingCode", { length: 50 }),
  passengerName: varchar("passengerName", { length: 255 }),
  value: decimal("value", { precision: 10, scale: 2 }).default("0.00").notNull(),
  voucherUrl: text("voucherUrl"),
  voucherKey: text("voucherKey"),
  status: mysqlEnum("status", ["confirmada", "pendente", "cancelada"]).default("pendente").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlightBooking = typeof flightBookings.$inferSelect;
export type InsertFlightBooking = typeof flightBookings.$inferInsert;

// ─── Checklists de Visita ───────────────────────────────────
export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  items: text("items").notNull(), // JSON array of { label, checked }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

// ─── Equipamentos de Visita ─────────────────────────────────
export const visitEquipment = mysqlTable("visitEquipment", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull(),
  equipmentName: varchar("equipmentName", { length: 255 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 100 }),
  quantity: int("quantity").default(1).notNull(),
  status: mysqlEnum("status", ["levado", "devolvido", "permaneceu"]).default("levado").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VisitEquipment = typeof visitEquipment.$inferSelect;
export type InsertVisitEquipment = typeof visitEquipment.$inferInsert;

// ─── Histórico de Alterações (Audit Log) ────────────────────
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: int("entityId"),
  action: varchar("action", { length: 50 }).notNull(),
  changedBy: varchar("changedBy", { length: 255 }),
  changes: text("changes"), // JSON of changed fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
