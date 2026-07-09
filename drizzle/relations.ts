import { relations } from "drizzle-orm";
import { clients, visits, trips, hotelReservations, documents, vehicles, drivers, employees, expenses } from "./schema";

export const clientRelations = relations(clients, ({ many }) => ({
  visits: many(visits),
}));

export const visitRelations = relations(visits, ({ many, one }) => ({
  client: one(clients, { fields: [visits.clientId], references: [clients.id] }),
  employee: one(employees, { fields: [visits.employeeId], references: [employees.id] }),
  trips: many(trips),
  expenses: many(expenses),
}));

export const tripRelations = relations(trips, ({ many, one }) => ({
  visit: one(visits, { fields: [trips.visitId], references: [visits.id] }),
  employee: one(employees, { fields: [trips.employeeId], references: [employees.id] }),
  hotelReservations: many(hotelReservations),
  expenses: many(expenses),
}));

export const hotelReservationRelations = relations(hotelReservations, ({ one }) => ({
  trip: one(trips, { fields: [hotelReservations.tripId], references: [trips.id] }),
  visit: one(visits, { fields: [hotelReservations.visitId], references: [visits.id] }),
}));

export const employeeRelations = relations(employees, ({ many }) => ({
  visits: many(visits),
  trips: many(trips),
  expenses: many(expenses),
  drivers: many(drivers),
}));

export const expenseRelations = relations(expenses, ({ one }) => ({
  trip: one(trips, { fields: [expenses.tripId], references: [trips.id] }),
  visit: one(visits, { fields: [expenses.visitId], references: [visits.id] }),
  employee: one(employees, { fields: [expenses.employeeId], references: [employees.id] }),
}));

export const driverRelations = relations(drivers, ({ one }) => ({
  employee: one(employees, { fields: [drivers.employeeId], references: [employees.id] }),
}));
