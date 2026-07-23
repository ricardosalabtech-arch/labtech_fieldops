import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { pushVisitToSalabtech, pushStatusToSalabtech, getSyncHistory } from "./sync";
import { createHeartbeatJob, updateHeartbeatJob, listHeartbeatJobs } from "./_core/heartbeat";

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
    loginWithPassword: publicProcedure.input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const employee = await db.getEmployeeByEmail(input.email);
      if (!employee || !employee.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos" });
      }
      if (employee.status !== "ativo") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Conta inativa. Contate o administrador." });
      }
      if (!db.verifyPassword(input.password, employee.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos" });
      }
      // Create a session token using the employee's email as openId prefix
      const openId = `emp_${employee.id}`;
      // Ensure user record exists in users table
      let user = await db.getUserByOpenId(openId);
      if (!user) {
        await db.upsertUser({
          openId,
          name: employee.name,
          email: employee.email ?? null,
          loginMethod: "password",
          role: employee.role === "administrador" ? "admin" : employee.role as "tecnico" | "especialista",
        });
        user = await db.getUserByOpenId(openId);
      } else {
        // Update role in case it changed
        await db.upsertUser({
          openId,
          name: employee.name,
          email: employee.email ?? null,
          role: employee.role === "administrador" ? "admin" : employee.role as "tecnico" | "especialista",
        });
      }
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao criar sessão" });
      }
      // Generate session token and set cookie
      const token = await sdk.createSessionToken(openId, { name: employee.name });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
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
    list: adminProcedure.query(async () => {
      const emps = await db.getEmployees();
      // Buscar dados de condutor vinculados a cada funcionário
      const result = await Promise.all(emps.map(async (e: any) => {
        const driver = await db.getDriverByEmployeeId(e.id);
        return { ...e, driver };
      }));
      return result;
    }),
    getDriver: protectedProcedure.input(z.object({ employeeId: z.number() })).query(async ({ input }) => {
      return db.getDriverByEmployeeId(input.employeeId);
    }),
    upsertDriver: adminProcedure.input(z.object({
      employeeId: z.number(),
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
      const existing = await db.getDriverByEmployeeId(input.employeeId);
      const data: any = { ...input };
      if (input.cnhExpiry) data.cnhExpiry = new Date(input.cnhExpiry);
      if (existing) {
        return db.updateDriver(existing.id, data);
      } else {
        return db.createDriver(data);
      }
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
      password: z.string().min(6).optional(),
    })).mutation(async ({ input }) => {
      const data: any = { ...input };
      if (input.hireDate) data.hireDate = new Date(input.hireDate);
      if (input.password) {
        data.passwordHash = db.hashPassword(input.password);
        delete data.password;
      }
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
      password: z.string().min(6).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data }: any = input;
      if (input.hireDate) data.hireDate = new Date(input.hireDate);
      if (input.password) {
        data.passwordHash = db.hashPassword(input.password);
        delete data.password;
      }
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
      // Técnicos e especialistas só veem suas próprias visitas
      if ((ctx.user.role === "tecnico" || ctx.user.role === "especialista" || ctx.user.role === "user") && ctx.user.name) {
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
    create: adminProcedure.input(z.object({
      clientId: z.number().optional(),
      clientName: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().optional(),
      visitDate: z.number(),
      endDate: z.number().optional(),
      scheduledTime: z.string().optional(),
      visitType: z.enum(["manutencao_preventiva", "manutencao_corretiva", "consultoria", "treinamento"]).default("manutencao_preventiva"),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      tripId: z.number().optional(),
      status: z.enum(["agendado", "em_andamento", "concluido", "cancelado"]).default("agendado"),
      transportMode: z.enum(["carro_empresa", "transporte_publico", "app", "aviao"]).optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      clientNotified: z.number().optional(),
      specialistNotified: z.number().optional(),
      technicianNotified: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const data: any = { ...input };
      data.visitDate = new Date(input.visitDate);
      if (input.endDate) data.endDate = new Date(input.endDate);
      const result = await db.createVisit(data);
      await db.createAuditLog({ entity: "visit", entityId: result.id, action: "create", changedBy: ctx.user.name, changes: JSON.stringify(input) });
      // Send real notifications based on form checkboxes
      const visitTypeLabel = input.visitType ? ({ manutencao_preventiva: "Manutenção Preventiva", manutencao_corretiva: "Manutenção Corretiva", consultoria: "Consultoria", treinamento: "Treinamento" } as Record<string, string>)[input.visitType] : "Visita Técnica";
      const notifyParts: string[] = [];
      if (input.clientNotified) notifyParts.push("Cliente");
      if (input.specialistNotified) notifyParts.push("Especialista");
      if (input.technicianNotified) notifyParts.push("Técnico");
      if (notifyParts.length > 0) {
        try {
          await notifyOwner({
            title: `Nova Visita Agendada — ${input.clientName || "Cliente"}`,
            content: `Tipo: ${visitTypeLabel}\nData: ${new Date(input.visitDate).toLocaleString("pt-BR")}${input.endDate ? " até " + new Date(input.endDate).toLocaleString("pt-BR") : ""}\nLocal: ${input.city || ""}/${input.state || ""}\nTécnico: ${input.employeeName || "Não atribuído"}\nNotificar: ${notifyParts.join(", ")}`,
          });
        } catch (e) {
          console.warn("[Visits] Failed to send notification:", e);
        }
      }
      // Push automático para salabtech.com
      try {
        await pushVisitToSalabtech(result);
      } catch (e) {
        console.warn("[Visits] Sync to salabtech.com failed:", e);
      }
      return result;
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      visitDate: z.number().optional(),
      endDate: z.number().optional(),
      scheduledTime: z.string().optional(),
      visitType: z.enum(["manutencao_preventiva", "manutencao_corretiva", "consultoria", "treinamento"]).optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().optional(),
      tripId: z.number().optional(),
      status: z.enum(["agendado", "em_andamento", "concluido", "cancelado"]).optional(),
      transportMode: z.enum(["carro_empresa", "transporte_publico", "app", "aviao"]).optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      clientNotified: z.number().optional(),
      specialistNotified: z.number().optional(),
      technicianNotified: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      // Técnicos/especialistas só podem alterar status e notas
      if (ctx.user.role !== "admin") {
        const allowed: any = {};
        if (data.status) allowed.status = data.status;
        if (data.notes !== undefined) allowed.notes = data.notes;
        if (Object.keys(allowed).length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Técnicos só podem alterar status e notas da visita" });
        await db.createAuditLog({ entity: "visit", entityId: id, action: "update_status", changedBy: ctx.user.name, changes: JSON.stringify(allowed) });
        const updated = await db.updateVisit(id, allowed as any);
        // Push status update to salabtech.com
        if (allowed.status) {
          try { await pushStatusToSalabtech(id, allowed.status); } catch (e) { console.warn("[Visits] Status sync failed:", e); }
        }
        return updated;
      }
      if (data.visitDate) data.visitDate = new Date(data.visitDate) as any;
      if (data.endDate) data.endDate = new Date(data.endDate) as any;
      await db.createAuditLog({ entity: "visit", entityId: id, action: "update", changedBy: ctx.user.name, changes: JSON.stringify(data) });
      const updated = await db.updateVisit(id, data as any);
      // Push full visit update to salabtech.com
      try { await pushVisitToSalabtech(updated); } catch (e) { console.warn("[Visits] Sync to salabtech.com failed:", e); }
      // Also push status update if status changed
      if (data.status) {
        try { await pushStatusToSalabtech(id, data.status); } catch (e) { console.warn("[Visits] Status sync failed:", e); }
      }
      return updated;
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteVisit(input.id);
      return { success: true };
    }),
    saveGeo: protectedProcedure.input(z.object({
      id: z.number(),
      latitude: z.string(),
      longitude: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const data: any = {
        latitude: input.latitude,
        longitude: input.longitude,
        geoTimestamp: new Date(),
      };
      await db.createAuditLog({ entity: "visit", entityId: input.id, action: "geo_update", changedBy: ctx.user.name, changes: JSON.stringify(data) });
      return db.updateVisit(input.id, data);
    }),
  }),

  // ─── Trips ─────────────────────────────────────────────────
  trips: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      employeeId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.employeeId) filters.employeeId = input.employeeId;
      if ((ctx.user.role === "tecnico" || ctx.user.role === "especialista" || ctx.user.role === "user") && ctx.user.name) {
        const employees = await db.getEmployees();
        const emp = employees.find(e => e.name === ctx.user.name);
        if (emp) filters.employeeId = emp.id;
      }
      return db.getTrips(filters);
    }),
    create: adminProcedure.input(z.object({
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
      const result = await db.createTrip({
        ...input,
        departureDate: new Date(input.departureDate),
        returnDate: input.returnDate ? new Date(input.returnDate) : undefined,
      } as any);
      // Sincronizar: se visitId foi fornecido, vincular visita à viagem
      if (input.visitId && result.id) {
        await db.linkVisitToTrip(input.visitId, result.id);
      }
      return result;
    }),
    update: adminProcedure.input(z.object({
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
      // Sincronizar: se visitId foi fornecido, vincular visita à viagem
      if (input.visitId) {
        await db.linkVisitToTrip(input.visitId, id);
      }
      return db.updateTrip(id, data as any);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTrip(input.id);
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]),
    })).mutation(async ({ input, ctx }) => {
      await db.createAuditLog({ entity: "trip", entityId: input.id, action: "status_update", changedBy: ctx.user.name, changes: JSON.stringify({ status: input.status }) });
      return db.updateTrip(input.id, { status: input.status } as any);
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
    create: adminProcedure.input(z.object({
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
    update: adminProcedure.input(z.object({
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
    list: protectedProcedure.input(z.object({ category: z.string().optional(), refId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getDocuments(input?.category, input?.refId);
    }),
    create: adminProcedure.input(z.object({
      category: z.enum(["veiculo", "condutor", "voucher", "passagem", "visita", "cliente", "despesa"]),
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
    upload: adminProcedure.input(z.object({
      category: z.enum(["veiculo", "condutor", "voucher", "passagem", "visita", "cliente", "despesa"]),
      refId: z.number().optional(),
      fileName: z.string().min(1),
      mimeType: z.string().default("application/octet-stream"),
      fileBase64: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileBase64.split(",").pop() ?? input.fileBase64, "base64");
      const ext = input.fileName.split(".").pop() || "bin";
      const key = `documents/${input.category}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { key: storedKey, url } = await storagePut(key, buffer, input.mimeType);
      const doc = await db.createDocument({
        category: input.category,
        refId: input.refId,
        name: input.fileName,
        fileUrl: url,
        fileKey: storedKey,
        mimeType: input.mimeType,
        fileSize: buffer.length,
        uploadedBy: ctx.user.name ?? "unknown",
      });
      return doc;
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
    }).optional()).query(async ({ input, ctx }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.employeeId) filters.employeeId = input.employeeId;
      if (input?.tripId) filters.tripId = input.tripId;
      if (input?.category) filters.category = input.category;
      if ((ctx.user.role === "tecnico" || ctx.user.role === "especialista" || ctx.user.role === "user") && ctx.user.name) {
        const employees = await db.getEmployees();
        const emp = employees.find(e => e.name === ctx.user.name);
        if (emp) filters.employeeId = emp.id;
      }
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
      category: z.enum(["transporte", "hospedagem", "alimentacao", "combustivel", "pedagio", "outros"]),
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
      category: z.enum(["transporte", "hospedagem", "alimentacao", "combustivel", "pedagio", "outros"]).optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      // Aprovação/rejeição restrita a admin
      if (data.status === "aprovado" || data.status === "rejeitado") {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem aprovar/rejeitar despesas" });
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
    create: adminProcedure.input(z.object({
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
    update: adminProcedure.input(z.object({
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

  // ─── Checklists ───────────────────────────────────────────
  checklists: router({
    list: protectedProcedure.input(z.object({ visitId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getChecklists(input?.visitId);
    }),
    create: protectedProcedure.input(z.object({
      visitId: z.number(),
      title: z.string().min(1),
      items: z.string(),
    })).mutation(async ({ input }) => {
      return db.createChecklist(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      items: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateChecklist(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteChecklist(input.id);
      return { success: true };
    }),
  }),

  // ─── Visit Equipment ───────────────────────────────────────
  visitEquipment: router({
    list: protectedProcedure.input(z.object({ visitId: z.number() })).query(async ({ input }) => {
      return db.getVisitEquipment(input.visitId);
    }),
    create: protectedProcedure.input(z.object({
      visitId: z.number(),
      tag: z.string().optional(),
      serialNumber: z.string().optional(),
      quantity: z.number().default(1),
      status: z.enum(["levado", "devolvido", "permaneceu"]).default("levado"),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createVisitEquipment(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      tag: z.string().optional(),
      serialNumber: z.string().optional(),
      quantity: z.number().optional(),
      status: z.enum(["levado", "devolvido", "permaneceu"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateVisitEquipment(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteVisitEquipment(input.id);
      return { success: true };
    }),
  }),

  // ─── Audit Log ─────────────────────────────────────────────
  auditLog: router({
    list: adminProcedure.input(z.object({
      entity: z.string().optional(),
      entityId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.getAuditLog(input?.entity, input?.entityId);
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

  // ─── Sync (sincronização com salabtech.com) ────────────────
  sync: router({
    history: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return getSyncHistory(input?.limit ?? 50);
    }),
    status: adminProcedure.query(async () => {
      // Check if heartbeat job exists
      try {
        const jobs = await listHeartbeatJobs("");
        const syncJob = jobs.jobs.find(j => j.name === "sync-salabtech");
        return {
          enabled: syncJob?.isEnable ?? false,
          cron: syncJob?.cronExpression ?? "0 0 * * * *",
          lastExecuted: syncJob?.lastExecutedAt ?? null,
          nextExecution: syncJob?.nextExecutionAt ?? null,
        };
      } catch {
        return { enabled: false, cron: "0 0 * * * *", lastExecuted: null, nextExecution: null };
      }
    }),
    toggleHeartbeat: adminProcedure.input(z.object({ enable: z.boolean() })).mutation(async ({ input }) => {
      try {
        const jobs = await listHeartbeatJobs("");
        const syncJob = jobs.jobs.find(j => j.name === "sync-salabtech");
        if (syncJob) {
          await updateHeartbeatJob(syncJob.taskUid, { enable: input.enable }, "");
        } else if (input.enable) {
          await createHeartbeatJob({
            name: "sync-salabtech",
            cron: "0 0 * * * *", // Every hour at minute 0
            path: "/api/scheduled/sync-salabtech",
            method: "POST",
            description: "Sincronização periódica de visitas com salabtech.com",
          }, "");
        }
        return { success: true, enabled: input.enable };
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e?.message || e) });
      }
    }),
    pushAll: adminProcedure.mutation(async () => {
      // Push all visits to salabtech.com (manual full sync)
      const allVisits = await db.getVisits();
      const results: any[] = [];
      for (const visit of allVisits) {
        if (visit.status === "agendado" || visit.status === "em_andamento") {
          try {
            const result = await pushVisitToSalabtech(visit);
            results.push({ visitId: visit.id, ...result });
          } catch (e: any) {
            results.push({ visitId: visit.id, success: false, error: String(e?.message || e) });
          }
        }
      }
      return { total: allVisits.length, pushed: results.filter(r => r.success).length, results };
    }),
  }),
});

export type AppRouter = typeof appRouter;
