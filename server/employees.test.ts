import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@salabtech.com",
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

function createUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "tech-user",
    email: "tech@salabtech.com",
    name: "Tech User",
    loginMethod: "manus",
    role: "user",
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
  getEmployees: vi.fn().mockResolvedValue([
    { id: 1, name: "João Silva", email: "joao@salabtech.com", role: "tecnico", position: "Técnico", department: "Campo", status: "ativo", hireDate: new Date("2024-01-15"), phone: null, photoUrl: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  createEmployee: vi.fn().mockResolvedValue({ id: 2, name: "Maria Santos", email: "maria@salabtech.com", role: "tecnico", position: "Técnico", status: "ativo", createdAt: new Date(), updatedAt: new Date() }),
  updateEmployee: vi.fn().mockResolvedValue({ id: 1, name: "João Silva Updated", position: "Senior Tech", status: "ativo" }),
  deleteEmployee: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({ visitsToday: 3, inProgress: 1, completed: 5, totalCosts: 1500.50, totalClients: 10, activeReservations: 2 }),
  getClients: vi.fn().mockResolvedValue([]),
  getVisits: vi.fn().mockResolvedValue([]),
  getTrips: vi.fn().mockResolvedValue([]),
  getHotelReservations: vi.fn().mockResolvedValue([]),
  getDocuments: vi.fn().mockResolvedValue([]),
  getVehicles: vi.fn().mockResolvedValue([]),
  getDrivers: vi.fn().mockResolvedValue([]),
  getExpenses: vi.fn().mockResolvedValue([]),
  getExpenseSummary: vi.fn().mockResolvedValue({ total: 0, approved: 0, pending: 0 }),
  getExpensesByEmployee: vi.fn().mockResolvedValue([]),
  getReportData: vi.fn().mockResolvedValue({ visits: [], trips: [], expenses: [] }),
}));

describe("employees router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin to list employees", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employees.list();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("João Silva");
  });

  it("allows regular user to list employees", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employees.list();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to create employee with new fields", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employees.create({
      name: "Maria Santos",
      email: "maria@salabtech.com",
      position: "Técnica",
      department: "Campo",
      status: "ativo",
    });
    expect(result).toBeDefined();
    expect(result.name).toBe("Maria Santos");
  });

  it("allows admin to update employee", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employees.update({
      id: 1,
      position: "Senior Tech",
    });
    expect(result).toBeDefined();
    expect(result.position).toBe("Senior Tech");
  });

  it("rejects non-admin from creating employee", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.employees.create({ name: "Test" })
    ).rejects.toThrow();
  });

  it("rejects non-admin from updating employee", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.employees.update({ id: 1, name: "Test" })
    ).rejects.toThrow();
  });
});

describe("dashboard router", () => {
  it("returns stats for authenticated user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.stats();
    expect(result).toBeDefined();
    expect(result.visitsToday).toBe(3);
    expect(result.totalClients).toBe(10);
  });
});
