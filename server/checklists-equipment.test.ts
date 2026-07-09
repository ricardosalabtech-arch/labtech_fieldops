import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

// Mock db module
vi.mock("./db", () => ({
  getChecklists: vi.fn().mockResolvedValue([
    { id: 1, visitId: 10, title: "Inspeção Preventiva", items: '[{"label":"Verificar temperatura","checked":false}]', createdAt: new Date(), updatedAt: new Date() },
  ]),
  createChecklist: vi.fn().mockResolvedValue({ id: 2, visitId: 10, title: "Nova Checklist", items: "[]", createdAt: new Date(), updatedAt: new Date() }),
  updateChecklist: vi.fn().mockResolvedValue({ id: 1, title: "Updated", items: "[]", updatedAt: new Date() }),
  deleteChecklist: vi.fn().mockResolvedValue(undefined),
  getVisitEquipment: vi.fn().mockResolvedValue([
    { id: 1, visitId: 10, equipmentName: "Multímetro", serialNumber: "SN001", quantity: 1, status: "levado", notes: null, createdAt: new Date() },
  ]),
  createVisitEquipment: vi.fn().mockResolvedValue({ id: 2, visitId: 10, equipmentName: "Calibrador", serialNumber: "SN002", quantity: 1, status: "levado", notes: null, createdAt: new Date() }),
  updateVisitEquipment: vi.fn().mockResolvedValue({ id: 1, status: "devolvido", updatedAt: new Date() }),
  deleteVisitEquipment: vi.fn().mockResolvedValue(undefined),
  getAuditLog: vi.fn().mockResolvedValue([
    { id: 1, entity: "visit", entityId: 10, action: "create", changedBy: "Admin", changes: "{}", createdAt: new Date() },
  ]),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe("checklists router", () => {
  it("lists checklists by visitId", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checklists.list({ visitId: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Inspeção Preventiva");
  });

  it("creates a checklist", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checklists.create({
      visitId: 10,
      title: "Nova Checklist",
      items: "[]",
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(2);
  });

  it("updates a checklist", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checklists.update({
      id: 1,
      items: '[{"label":"Item 1","checked":true}]',
    });
    expect(result).toBeDefined();
  });

  it("deletes a checklist (admin only)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checklists.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("visitEquipment router", () => {
  it("lists equipment by visitId", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.visitEquipment.list({ visitId: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]?.equipmentName).toBe("Multímetro");
  });

  it("creates equipment entry", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.visitEquipment.create({
      visitId: 10,
      equipmentName: "Calibrador",
      serialNumber: "SN002",
      quantity: 1,
      status: "levado",
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(2);
  });

  it("updates equipment status", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.visitEquipment.update({
      id: 1,
      status: "devolvido",
    });
    expect(result).toBeDefined();
  });

  it("deletes equipment (admin only)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.visitEquipment.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("auditLog router", () => {
  it("lists audit log entries (admin only)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auditLog.list({ entity: "visit", entityId: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]?.action).toBe("create");
  });
});
