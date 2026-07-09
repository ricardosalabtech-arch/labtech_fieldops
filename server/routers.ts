import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
  }),

  // ─── Clients ───────────────────────────────────────────────
  clients: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getClients(input?.search);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const client = await db.getClientById(input.id);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
      return client;
    }),
    history: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getClientVisitHistory(input.id);
    }),
    create: adminProcedure.input(z.object({
      companyName: z.string().min(1),
      cnpj: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      responsibleName: z.string().min(1),
      responsibleEmail: z.string().email(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createClient(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      companyName: z.string().optional(),
      cnpj: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      responsibleName: z.string().optional(),
      responsibleEmail: z.string().email().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateClient(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteClient(input.id);
      return { success: true };
    }),
  }),

  // ─── Employees ─────────────────────────────────────────────
  employees: router({
    list: protectedProcedure.query(async () => {
      return db.getEmployees();
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(["tecnico", "especialista", "administrador"]).default("tecnico"),
      position: z.string().optional(),
      department: z.string().optional(),
      hireDate: z.number().optional(),
      status: z.enum(["ativo", "inativo"]).default("ativo"),
      photoUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const data: any = { ...input };
      if (input.hireDate) data.hireDate = new Date(input.hireDate);
      return db.createEmployee(data);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(["tecnico", "especialista", "administrador"]).optional(),
      position: z.string().optional(),
      department: z.string().optional(),
      hireDate: z.number().optional(),
      status: z.enum(["ativo", "inativo"]).optional(),
      photoUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data }: any = input;
      if (input.hireDate) data.hireDate = new Date(input.hireDate);
      return db.updateEmployee(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteEmployee(input.id);
      return { success: true };
    }),
  }),

  // ─── Visits ────────────────────────────────────────────────
  visits: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      employeeId: z.number().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.startDate) filters.startDate = new Date(input.startDate!);
      if (input?.endDate) filters.endDate = new Date(input.endDate!);
      // Técnicos só veem suas próprias visitas
      if (ctx.user.role !== "admin" && ctx.user.name) {
        // Buscar funcionário pelo nome
        const employees = await db.getEmployees();
        const emp = employees.find(e => e.name === ctx.user.name);
        if (emp) filters.employeeId = emp.id;
      }
      return db.getVisits(filters);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const visit = await db.getVisitById(input.id);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita não encontrada" });
      return visit;
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number().optional(),
      clientName: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().optional(),
      visitDate: z.number(),
      scheduledTime: z.string().optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      status: z.enum(["agendado", "em_andamento", "concluido", "cancelado"]).default("agendado"),
      transportMode: z.enum(["carro_empresa", "transporte_publico", "app", "aviao"]).optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createVisit({
        ...input,
        visitDate: new Date(input.visitDate),
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      visitDate: z.number().optional(),
      scheduledTime: z.string().optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      status: z.enum(["agendado", "em_andamento", "concluido", "cancelado"]).optional(),
      transportMode: z.enum(["carro_empresa", "transporte_publico", "app", "aviao"]).optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (data.visitDate) data.visitDate = new Date(data.visitDate) as any;
      return db.updateVisit(id, data as any);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteVisit(input.id);
      return { success: true };
    }),
  }),

  // ─── Trips ─────────────────────────────────────────────────
  trips: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      employeeId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.employeeId) filters.employeeId = input.employeeId;
      return db.getTrips(filters);
    }),
    create: protectedProcedure.input(z.object({
      visitId: z.number().optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      transportMode: z.enum(["carro_empresa", "transporte_publico", "app", "aviao"]).default("carro_empresa"),
      vehicleInfo: z.string().optional(),
      departureDate: z.number(),
      returnDate: z.number().optional(),
      returnAddress: z.string().optional(),
      status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]).default("planejada"),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createTrip({
        ...input,
        departureDate: new Date(input.departureDate),
        returnDate: input.returnDate ? new Date(input.returnDate) : undefined,
      } as any);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      visitId: z.number().optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      transportMode: z.enum(["carro_empresa", "transporte_publico", "app", "aviao"]).optional(),
      vehicleInfo: z.string().optional(),
      departureDate: z.number().optional(),
      returnDate: z.number().optional(),
      returnAddress: z.string().optional(),
      status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (data.departureDate) data.departureDate = new Date(data.departureDate) as any;
      if (data.returnDate) data.returnDate = new Date(data.returnDate) as any;
      return db.updateTrip(id, data as any);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTrip(input.id);
      return { success: true };
    }),
  }),

  // ─── Hotel Reservations ────────────────────────────────────
  hotelReservations: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      tripId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.tripId) filters.tripId = input.tripId;
      return db.getHotelReservations(filters);
    }),
    create: protectedProcedure.input(z.object({
      tripId: z.number().optional(),
      visitId: z.number().optional(),
      hotelName: z.string().min(1),
      city: z.string().min(1),
      checkIn: z.number(),
      checkOut: z.number(),
      confirmationNumber: z.string().optional(),
      value: z.string().default("0.00"),
      observations: z.string().optional(),
      status: z.enum(["confirmada", "pendente", "cancelada"]).default("pendente"),
      voucherUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createHotelReservation({
        ...input,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
      } as any);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      hotelName: z.string().optional(),
      city: z.string().optional(),
      checkIn: z.number().optional(),
      checkOut: z.number().optional(),
      confirmationNumber: z.string().optional(),
      value: z.string().optional(),
      observations: z.string().optional(),
      status: z.enum(["confirmada", "pendente", "cancelada"]).optional(),
      voucherUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (data.checkIn) data.checkIn = new Date(data.checkIn) as any;
      if (data.checkOut) data.checkOut = new Date(data.checkOut) as any;
      return db.updateHotelReservation(id, data as any);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteHotelReservation(input.id);
      return { success: true };
    }),
  }),

  // ─── Documents ─────────────────────────────────────────────
  documents: router({
    list: protectedProcedure.input(z.object({ category: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getDocuments(input?.category);
    }),
    create: protectedProcedure.input(z.object({
      category: z.enum(["veiculo", "condutor", "voucher", "passagem", "visita", "cliente"]),
      refId: z.number().optional(),
      name: z.string().min(1),
      fileUrl: z.string().min(1),
      fileKey: z.string().min(1),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
      uploadedBy: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createDocument(input);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true };
    }),
  }),

  // ─── Vehicles ──────────────────────────────────────────────
  vehicles: router({
    list: protectedProcedure.query(async () => {
      return db.getVehicles();
    }),
    create: adminProcedure.input(z.object({
      plate: z.string().min(1),
      year: z.string().optional(),
      model: z.string().min(1),
      color: z.string().optional(),
      crlvExpiry: z.number().optional(),
      insuranceExpiry: z.number().optional(),
      inspectionExpiry: z.number().optional(),
      photoUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const data: any = { ...input };
      if (input.crlvExpiry) data.crlvExpiry = new Date(input.crlvExpiry);
      if (input.insuranceExpiry) data.insuranceExpiry = new Date(input.insuranceExpiry);
      if (input.inspectionExpiry) data.inspectionExpiry = new Date(input.inspectionExpiry);
      return db.createVehicle(data);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      plate: z.string().optional(),
      year: z.string().optional(),
      model: z.string().optional(),
      color: z.string().optional(),
      crlvExpiry: z.number().optional(),
      insuranceExpiry: z.number().optional(),
      inspectionExpiry: z.number().optional(),
      photoUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data }: any = input;
      if (input.crlvExpiry) data.crlvExpiry = new Date(input.crlvExpiry);
      if (input.insuranceExpiry) data.insuranceExpiry = new Date(input.insuranceExpiry);
      if (input.inspectionExpiry) data.inspectionExpiry = new Date(input.inspectionExpiry);
      return db.updateVehicle(id, data as any);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteVehicle(input.id);
      return { success: true };
    }),
  }),

  // ─── Drivers ───────────────────────────────────────────────
  drivers: router({
    list: protectedProcedure.query(async () => {
      return db.getDrivers();
    }),
    create: adminProcedure.input(z.object({
      employeeId: z.number().optional(),
      fullName: z.string().min(1),
      cpf: z.string().optional(),
      cnhNumber: z.string().optional(),
      cnhCategory: z.string().optional(),
      cnhExpiry: z.number().optional(),
      bloodType: z.string().optional(),
      address: z.string().optional(),
      email: z.string().email().optional(),
      photoUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const data: any = { ...input };
      if (input.cnhExpiry) data.cnhExpiry = new Date(input.cnhExpiry);
      return db.createDriver(data);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      fullName: z.string().optional(),
      cpf: z.string().optional(),
      cnhNumber: z.string().optional(),
      cnhCategory: z.string().optional(),
      cnhExpiry: z.number().optional(),
      bloodType: z.string().optional(),
      address: z.string().optional(),
      email: z.string().email().optional(),
      photoUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data }: any = input;
      if (input.cnhExpiry) data.cnhExpiry = new Date(input.cnhExpiry);
      return db.updateDriver(id, data as any);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDriver(input.id);
      return { success: true };
    }),
  }),

  // ─── Expenses ──────────────────────────────────────────────
  expenses: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      employeeId: z.number().optional(),
      tripId: z.number().optional(),
      category: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.employeeId) filters.employeeId = input.employeeId;
      if (input?.tripId) filters.tripId = input.tripId;
      if (input?.category) filters.category = input.category;
      return db.getExpenses(filters);
    }),
    summary: protectedProcedure.query(async () => {
      return db.getExpenseSummary();
    }),
    byEmployee: protectedProcedure.query(async () => {
      return db.getExpensesByEmployee();
    }),
    create: protectedProcedure.input(z.object({
      tripId: z.number().optional(),
      visitId: z.number().optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      category: z.enum(["transporte", "hospedagem", "alimentacao", "outros"]),
      description: z.string().optional(),
      amount: z.string(),
      status: z.enum(["pendente", "aprovado", "rejeitado"]).default("pendente"),
      receiptUrl: z.string().optional(),
      receiptKey: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createExpense(input as any);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pendente", "aprovado", "rejeitado"]).optional(),
      category: z.enum(["transporte", "hospedagem", "alimentacao", "outros"]).optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.status === "aprovado") {
        updateData.approvedBy = ctx.user.name ?? "admin";
        updateData.approvedAt = new Date();
      }
      return db.updateExpense(id, updateData);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteExpense(input.id);
      return { success: true };
    }),
  }),

  // ─── Flight Bookings (Passagens de Avião) ──────────────────
  flightBookings: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      tripId: z.number().optional(),
      visitId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.tripId) filters.tripId = input.tripId;
      if (input?.visitId) filters.visitId = input.visitId;
      return db.getFlightBookings(filters);
    }),
    create: protectedProcedure.input(z.object({
      tripId: z.number().optional(),
      visitId: z.number().optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      airline: z.string().min(1),
      flightNumber: z.string().min(1),
      originAirport: z.string().min(1),
      destinationAirport: z.string().min(1),
      originCity: z.string().optional(),
      destinationCity: z.string().optional(),
      departureDateTime: z.number(),
      arrivalDateTime: z.number().optional(),
      seat: z.string().optional(),
      gate: z.string().optional(),
      bookingCode: z.string().optional(),
      passengerName: z.string().optional(),
      value: z.string().default("0.00"),
      voucherUrl: z.string().optional(),
      voucherKey: z.string().optional(),
      status: z.enum(["confirmada", "pendente", "cancelada"]).default("pendente"),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const data: any = { ...input };
      data.departureDateTime = new Date(input.departureDateTime);
      if (input.arrivalDateTime) data.arrivalDateTime = new Date(input.arrivalDateTime);
      return db.createFlightBooking(data);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      airline: z.string().optional(),
      flightNumber: z.string().optional(),
      originAirport: z.string().optional(),
      destinationAirport: z.string().optional(),
      originCity: z.string().optional(),
      destinationCity: z.string().optional(),
      departureDateTime: z.number().optional(),
      arrivalDateTime: z.number().optional(),
      seat: z.string().optional(),
      gate: z.string().optional(),
      bookingCode: z.string().optional(),
      passengerName: z.string().optional(),
      value: z.string().optional(),
      voucherUrl: z.string().optional(),
      voucherKey: z.string().optional(),
      status: z.enum(["confirmada", "pendente", "cancelada"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data }: any = input;
      if (input.departureDateTime) data.departureDateTime = new Date(input.departureDateTime);
      if (input.arrivalDateTime) data.arrivalDateTime = new Date(input.arrivalDateTime);
      return db.updateFlightBooking(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteFlightBooking(input.id);
      return { success: true };
    }),
  }),

  // ─── Reports ───────────────────────────────────────────────
  reports: router({
    consolidated: protectedProcedure.input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    })).query(async ({ input }) => {
      return db.getReportData(new Date(input.startDate), new Date(input.endDate));
    }),
  }),
});

export type AppRouter = typeof appRouter;
