import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getClientById: vi.fn(),
  getVisitEquipment: vi.fn(),
  createSyncLog: vi.fn(),
}));

import * as db from "./db";
import { pushVisitToPortal } from "./sync";

describe("sincronização de Agenda do FieldOps para o Portal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("envia CNPJ, TAG e status normalizado para o webhook autenticado", async () => {
    vi.stubEnv("FIELD_APP_WEBHOOK_SECRET", "secret-test");
    vi.mocked(db.getClientById).mockResolvedValue({ id: 7, companyName: "Empresa teste", cnpj: "02.003.402/0024-61" } as any);
    vi.mocked(db.getVisitEquipment).mockResolvedValue([{ tag: "TAG-ADM-01" }] as any);
    vi.mocked(db.createSyncLog).mockResolvedValue(undefined as any);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ visitId: "visit-portal" }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pushVisitToPortal({ id: 42, clientId: 7, clientName: "Empresa teste", visitType: "manutencao_corretiva", status: "agendado", visitDate: new Date("2026-09-10T12:00:00.000Z"), employeeName: "Técnico" })).resolves.toEqual({ success: true, visitId: "visit-portal" });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/integrations/field-app/visits");
    expect(request.headers).toMatchObject({ "x-field-webhook-secret": "secret-test" });
    expect(JSON.parse(String(request.body))).toMatchObject({ externalVisitId: "FIELDOPS-42", clientCnpj: "02003402002461", equipmentTag: "TAG-ADM-01", status: "scheduled", visitType: "maintenance" });
  });

  it("recusa a emissão quando a visita não tem CNPJ e não faz chamada externa", async () => {
    vi.stubEnv("FIELD_APP_WEBHOOK_SECRET", "secret-test");
    vi.mocked(db.getClientById).mockResolvedValue({ id: 7, companyName: "Empresa teste", cnpj: null } as any);
    vi.mocked(db.createSyncLog).mockResolvedValue(undefined as any);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(pushVisitToPortal({ id: 43, clientId: 7, visitType: "manutencao_preventiva", status: "agendado" })).resolves.toMatchObject({ success: false, error: expect.stringContaining("CNPJ") });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
