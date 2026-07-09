import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@labtech.com",
    name: "Admin Test",
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

describe("flightBookings router", () => {
  it("list is accessible to authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should return an array (empty if no data)
    const result = await caller.flightBookings.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list accepts optional filters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.flightBookings.list({ status: "pendente" });
    expect(Array.isArray(result)).toBe(true);
    result.forEach(item => {
      expect(item.status).toBe("pendente");
    });
  });

  it("list can filter by tripId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.flightBookings.list({ tripId: 999 });
    expect(Array.isArray(result)).toBe(true);
  });
});
