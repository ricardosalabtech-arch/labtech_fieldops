import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "documents/test/file_abc123.pdf", url: "/manus-storage/documents/test/file_abc123.pdf" }),
}));

vi.mock("./db", () => ({
  createDocument: vi.fn().mockImplementation((input: any) => Promise.resolve({
    id: 1,
    category: input.category,
    refId: input.refId,
    name: input.name,
    fileUrl: "/manus-storage/documents/test/file_abc123.pdf",
    fileKey: "documents/test/file_abc123.pdf",
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    uploadedBy: input.uploadedBy,
    createdAt: new Date(),
  })),
  getDocuments: vi.fn().mockResolvedValue([]),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

describe("documents.upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a voucher file and returns the created document", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.upload({
      category: "voucher",
      fileName: "voucher-hotel.pdf",
      mimeType: "application/pdf",
      fileBase64: "data:application/pdf;base64,JVBERi0xLjQKJcfs...",
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.category).toBe("voucher");
    expect(result.name).toBe("voucher-hotel.pdf");
    expect(result.fileUrl).toContain("/manus-storage/");
    expect(result.fileKey).toContain("documents/");
  });

  it("uploads a passagem (flight ticket) file", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.upload({
      category: "passagem",
      fileName: "boarding-pass.png",
      mimeType: "image/png",
      fileBase64: "data:image/png;base64,iVBORw0KGgo...",
    });

    expect(result).toBeDefined();
    expect(result.category).toBe("passagem");
    expect(result.name).toBe("boarding-pass.png");
  });

  it("rejects upload without fileName", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.documents.upload({
        category: "voucher",
        fileName: "",
        mimeType: "application/pdf",
        fileBase64: "data:application/pdf;base64,JVBERi0xLjQK",
      }),
    ).rejects.toThrow();
  });
});
