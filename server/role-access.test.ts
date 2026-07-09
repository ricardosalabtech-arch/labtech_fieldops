import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "tecnico" | "especialista" | "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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

describe("Role-based access control", () => {
  it("admin can create visits", async () => {
    const { ctx } = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    // This should not throw FORBIDDEN — it will throw a validation or DB error instead
    try {
      await caller.visits.create({
        clientName: "Test Client",
        address: "Test Address",
        city: "Test City",
        visitDate: Date.now(),
      });
    } catch (e: any) {
      // Should NOT be FORBIDDEN
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("tecnico cannot create visits (FORBIDDEN)", async () => {
    const { ctx } = createContext("tecnico");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.visits.create({
        clientName: "Test Client",
        address: "Test Address",
        city: "Test City",
        visitDate: Date.now(),
      });
      expect.unreachable("Should have thrown FORBIDDEN");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("especialista cannot create visits (FORBIDDEN)", async () => {
    const { ctx } = createContext("especialista");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.visits.create({
        clientName: "Test Client",
        address: "Test Address",
        city: "Test City",
        visitDate: Date.now(),
      });
      expect.unreachable("Should have thrown FORBIDDEN");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("tecnico cannot create clients (FORBIDDEN)", async () => {
    const { ctx } = createContext("tecnico");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.clients.create({
        companyName: "Test Company",
        cnpj: "12345678000199",
        contactName: "Contact",
        phone: "11999999999",
        email: "test@test.com",
        city: "São Paulo",
        state: "SP",
      });
      expect.unreachable("Should have thrown FORBIDDEN");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("tecnico cannot approve expenses (FORBIDDEN)", async () => {
    const { ctx } = createContext("tecnico");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.expenses.update({ id: 1, status: "aprovado" });
      expect.unreachable("Should have thrown FORBIDDEN");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("admin can approve expenses (not FORBIDDEN)", async () => {
    const { ctx } = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.expenses.update({ id: 999, status: "aprovado" });
    } catch (e: any) {
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("especialista cannot delete clients (FORBIDDEN)", async () => {
    const { ctx } = createContext("especialista");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.clients.delete({ id: 1 });
      expect.unreachable("Should have thrown FORBIDDEN");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("tecnico cannot access audit log (FORBIDDEN)", async () => {
    const { ctx } = createContext("tecnico");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.auditLog.list({ entity: "visit" });
      expect.unreachable("Should have thrown FORBIDDEN");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });
});
