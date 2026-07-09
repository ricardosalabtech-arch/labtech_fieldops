import { eq, like, desc, and, gte, lte, sql, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertClient, clients,
  InsertEmployee, employees,
  InsertVisit, visits,
  InsertTrip, trips,
  InsertHotelReservation, hotelReservations,
  InsertDocument, documents,
  InsertVehicle, vehicles,
  InsertDriver, drivers,
  InsertExpense, expenses,
  InsertFlightBooking, flightBookings,
  InsertChecklist, checklists,
  InsertVisitEquipment, visitEquipment,
  InsertAuditLog, auditLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ──────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach((field) => {
      const value = user[field];
      if (value !== undefined) { values[field] = value ?? null; updateSet[field] = value ?? null; }
    });
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Clients ────────────────────────────────────────────────
export async function getClients(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(clients)
      .where(like(sql`CONCAT(${clients.companyName}, ${clients.responsibleName}, ${clients.cnpj})`, `%${search}%`))
      .orderBy(desc(clients.createdAt));
  }
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(clients).values(data);
  const result = await db.select().from(clients).orderBy(desc(clients.id)).limit(1);
  return result[0];
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, id));
}

export async function getClientVisitHistory(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visits).where(eq(visits.clientId, clientId)).orderBy(desc(visits.visitDate));
}

// ─── Employees ──────────────────────────────────────────────
export async function getEmployees() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees).orderBy(desc(employees.createdAt));
}

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(employees).values(data);
  const result = await db.select().from(employees).orderBy(desc(employees.id)).limit(1);
  return result[0];
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employees).where(eq(employees.id, id));
}

// ─── Visits ─────────────────────────────────────────────────
export async function getVisits(filters?: { status?: string; employeeId?: number; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(visits.status, filters.status as any));
  if (filters?.employeeId) conditions.push(eq(visits.employeeId, filters.employeeId));
  if (filters?.startDate) conditions.push(gte(visits.visitDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(visits.visitDate, filters.endDate));
  if (conditions.length > 0) {
    return db.select().from(visits).where(and(...conditions)).orderBy(desc(visits.visitDate));
  }
  return db.select().from(visits).orderBy(desc(visits.visitDate));
}

export async function getVisitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
  return result[0];
}

export async function createVisit(data: InsertVisit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(visits).values(data);
  const result = await db.select().from(visits).orderBy(desc(visits.id)).limit(1);
  return result[0];
}

export async function updateVisit(id: number, data: Partial<InsertVisit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(visits).set(data).where(eq(visits.id, id));
  const result = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
  return result[0];
}

export async function deleteVisit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(visits).where(eq(visits.id, id));
}

// ─── Trips ──────────────────────────────────────────────────
export async function getTrips(filters?: { status?: string; employeeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(trips.status, filters.status as any));
  if (filters?.employeeId) conditions.push(eq(trips.employeeId, filters.employeeId));
  if (conditions.length > 0) {
    return db.select().from(trips).where(and(...conditions)).orderBy(desc(trips.departureDate));
  }
  return db.select().from(trips).orderBy(desc(trips.departureDate));
}

export async function createTrip(data: InsertTrip) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(trips).values(data);
  const result = await db.select().from(trips).orderBy(desc(trips.id)).limit(1);
  return result[0];
}

export async function updateTrip(id: number, data: Partial<InsertTrip>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trips).set(data).where(eq(trips.id, id));
  const result = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  return result[0];
}

export async function deleteTrip(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(trips).where(eq(trips.id, id));
}

// ─── Hotel Reservations ─────────────────────────────────────
export async function getHotelReservations(filters?: { status?: string; tripId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(hotelReservations.status, filters.status as any));
  if (filters?.tripId) conditions.push(eq(hotelReservations.tripId, filters.tripId));
  if (conditions.length > 0) {
    return db.select().from(hotelReservations).where(and(...conditions)).orderBy(desc(hotelReservations.checkIn));
  }
  return db.select().from(hotelReservations).orderBy(desc(hotelReservations.checkIn));
}

export async function createHotelReservation(data: InsertHotelReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(hotelReservations).values(data);
  const result = await db.select().from(hotelReservations).orderBy(desc(hotelReservations.id)).limit(1);
  return result[0];
}

export async function updateHotelReservation(id: number, data: Partial<InsertHotelReservation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hotelReservations).set(data).where(eq(hotelReservations.id, id));
  const result = await db.select().from(hotelReservations).where(eq(hotelReservations.id, id)).limit(1);
  return result[0];
}

export async function deleteHotelReservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hotelReservations).where(eq(hotelReservations.id, id));
}

// ─── Documents ──────────────────────────────────────────────
export async function getDocuments(category?: string, refId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (category) conditions.push(eq(documents.category, category as any));
  if (refId) conditions.push(eq(documents.refId, refId));
  if (conditions.length === 0) {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }
  if (conditions.length === 1) {
    return db.select().from(documents).where(conditions[0]).orderBy(desc(documents.createdAt));
  }
  return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(documents).values(data);
  const result = await db.select().from(documents).orderBy(desc(documents.id)).limit(1);
  return result[0];
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documents).where(eq(documents.id, id));
}

// ─── Vehicles ───────────────────────────────────────────────
export async function getVehicles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
}

export async function createVehicle(data: InsertVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(vehicles).values(data);
  const result = await db.select().from(vehicles).orderBy(desc(vehicles.id)).limit(1);
  return result[0];
}

export async function updateVehicle(id: number, data: Partial<InsertVehicle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(vehicles).set(data).where(eq(vehicles.id, id));
  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result[0];
}

export async function deleteVehicle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(vehicles).where(eq(vehicles.id, id));
}

// ─── Drivers ────────────────────────────────────────────────
export async function getDrivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drivers).orderBy(desc(drivers.createdAt));
}

export async function createDriver(data: InsertDriver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(drivers).values(data);
  const result = await db.select().from(drivers).orderBy(desc(drivers.id)).limit(1);
  return result[0];
}

export async function updateDriver(id: number, data: Partial<InsertDriver>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(drivers).set(data).where(eq(drivers.id, id));
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result[0];
}

export async function deleteDriver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(drivers).where(eq(drivers.id, id));
}

// ─── Expenses ───────────────────────────────────────────────
export async function getExpenses(filters?: { status?: string; employeeId?: number; tripId?: number; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(expenses.status, filters.status as any));
  if (filters?.employeeId) conditions.push(eq(expenses.employeeId, filters.employeeId));
  if (filters?.tripId) conditions.push(eq(expenses.tripId, filters.tripId));
  if (filters?.category) conditions.push(eq(expenses.category, filters.category as any));
  if (conditions.length > 0) {
    return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.createdAt));
  }
  return db.select().from(expenses).orderBy(desc(expenses.createdAt));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(expenses).values(data);
  const result = await db.select().from(expenses).orderBy(desc(expenses.id)).limit(1);
  return result[0];
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set(data).where(eq(expenses.id, id));
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result[0];
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function getExpenseSummary() {
  const db = await getDb();
  if (!db) return { total: 0, approved: 0, pending: 0 };
  const totalResult = await db.select({ total: sum(expenses.amount) }).from(expenses);
  const approvedResult = await db.select({ total: sum(expenses.amount) }).from(expenses).where(eq(expenses.status, 'aprovado'));
  const pendingResult = await db.select({ total: sum(expenses.amount) }).from(expenses).where(eq(expenses.status, 'pendente'));
  return {
    total: Number(totalResult[0]?.total ?? 0),
    approved: Number(approvedResult[0]?.total ?? 0),
    pending: Number(pendingResult[0]?.total ?? 0),
  };
}

export async function getExpensesByEmployee() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    employeeId: expenses.employeeId,
    employeeName: expenses.employeeName,
    total: sum(expenses.amount),
    pending: sql`SUM(CASE WHEN ${expenses.status} = 'pendente' THEN ${expenses.amount} ELSE 0 END)`,
    approved: sql`SUM(CASE WHEN ${expenses.status} = 'aprovado' THEN ${expenses.amount} ELSE 0 END)`,
    count: count(),
    pendingCount: sql`SUM(CASE WHEN ${expenses.status} = 'pendente' THEN 1 ELSE 0 END)`,
  }).from(expenses).groupBy(expenses.employeeId, expenses.employeeName);
}

// ─── Dashboard ──────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { visitsToday: 0, inProgress: 0, completed: 0, totalCosts: 0, totalClients: 0, activeReservations: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const visitsTodayResult = await db.select({ count: count() }).from(visits).where(and(gte(visits.visitDate, today), lte(visits.visitDate, tomorrow)));
  const inProgressResult = await db.select({ count: count() }).from(visits).where(eq(visits.status, 'em_andamento'));
  const completedResult = await db.select({ count: count() }).from(visits).where(eq(visits.status, 'concluido'));
  const totalCostsResult = await db.select({ total: sum(expenses.amount) }).from(expenses);
  const totalClientsResult = await db.select({ count: count() }).from(clients);
  const activeReservationsResult = await db.select({ count: count() }).from(hotelReservations).where(eq(hotelReservations.status, 'confirmada'));

  return {
    visitsToday: visitsTodayResult[0]?.count ?? 0,
    inProgress: inProgressResult[0]?.count ?? 0,
    completed: completedResult[0]?.count ?? 0,
    totalCosts: Number(totalCostsResult[0]?.total ?? 0),
    totalClients: totalClientsResult[0]?.count ?? 0,
    activeReservations: activeReservationsResult[0]?.count ?? 0,
  };
}

// ─── Reports ────────────────────────────────────────────────
export async function getReportData(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { visits: [], expenses: [], trips: [] };

  const reportVisits = await db.select().from(visits)
    .where(and(gte(visits.visitDate, startDate), lte(visits.visitDate, endDate)))
    .orderBy(desc(visits.visitDate));

  const reportExpenses = await db.select().from(expenses)
    .where(and(gte(expenses.createdAt, startDate), lte(expenses.createdAt, endDate)))
    .orderBy(desc(expenses.createdAt));

  const reportTrips = await db.select().from(trips)
    .where(and(gte(trips.departureDate, startDate), lte(trips.departureDate, endDate)))
    .orderBy(desc(trips.departureDate));

  return { visits: reportVisits, expenses: reportExpenses, trips: reportTrips };
}

// ─── Flight Bookings (Passagens de Avião) ────────────────────
export async function getFlightBookings(filters?: { status?: string; tripId?: number; visitId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(flightBookings.status, filters.status as any));
  if (filters?.tripId) conditions.push(eq(flightBookings.tripId, filters.tripId));
  if (filters?.visitId) conditions.push(eq(flightBookings.visitId, filters.visitId));
  if (conditions.length > 0) {
    return db.select().from(flightBookings).where(and(...conditions)).orderBy(desc(flightBookings.departureDateTime));
  }
  return db.select().from(flightBookings).orderBy(desc(flightBookings.departureDateTime));
}

export async function createFlightBooking(data: InsertFlightBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(flightBookings).values(data);
  const result = await db.select().from(flightBookings).orderBy(desc(flightBookings.id)).limit(1);
  return result[0];
}

export async function updateFlightBooking(id: number, data: Partial<InsertFlightBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(flightBookings).set(data).where(eq(flightBookings.id, id));
  const result = await db.select().from(flightBookings).where(eq(flightBookings.id, id)).limit(1);
  return result[0];
}

export async function deleteFlightBooking(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(flightBookings).where(eq(flightBookings.id, id));
}

// ─── Checklists ─────────────────────────────────────────────
export async function getChecklists(visitId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (visitId) {
    return db.select().from(checklists).where(eq(checklists.visitId, visitId)).orderBy(desc(checklists.createdAt));
  }
  return db.select().from(checklists).orderBy(desc(checklists.createdAt));
}

export async function createChecklist(data: InsertChecklist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(checklists).values(data);
  const result = await db.select().from(checklists).orderBy(desc(checklists.id)).limit(1);
  return result[0];
}

export async function updateChecklist(id: number, data: Partial<InsertChecklist>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(checklists).set(data).where(eq(checklists.id, id));
  const result = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1);
  return result[0];
}

export async function deleteChecklist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(checklists).where(eq(checklists.id, id));
}

// ─── Visit Equipment ────────────────────────────────────────
export async function getVisitEquipment(visitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visitEquipment).where(eq(visitEquipment.visitId, visitId)).orderBy(desc(visitEquipment.createdAt));
}

export async function createVisitEquipment(data: InsertVisitEquipment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(visitEquipment).values(data);
  const result = await db.select().from(visitEquipment).orderBy(desc(visitEquipment.id)).limit(1);
  return result[0];
}

export async function updateVisitEquipment(id: number, data: Partial<InsertVisitEquipment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(visitEquipment).set(data).where(eq(visitEquipment.id, id));
  const result = await db.select().from(visitEquipment).where(eq(visitEquipment.id, id)).limit(1);
  return result[0];
}

export async function deleteVisitEquipment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(visitEquipment).where(eq(visitEquipment.id, id));
}

// ─── Audit Log ──────────────────────────────────────────────
export async function getAuditLog(entity?: string, entityId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (entity) conditions.push(eq(auditLog.entity, entity));
  if (entityId) conditions.push(eq(auditLog.entityId, entityId));
  if (conditions.length > 0) {
    return db.select().from(auditLog).where(and(...conditions)).orderBy(desc(auditLog.createdAt));
  }
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt));
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values(data);
}
