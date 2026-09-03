/**
 * Sync module — Sincronização bidirecional de agendas entre FieldOps e salabtech.com
 *
 * Push (FieldOps → salabtech.com): quando uma visita é criada ou atualizada,
 * envia os dados para o webhook /api/webhooks/agendamentos do salabtech.com,
 * que cria/atualiza uma Ordem de Serviço correspondente.
 *
 * Pull (salabtech.com → FieldOps): consulta o endpoint /fieldops/visits do
 * FieldOps a partir do salabtech.com para verificar mudanças de status.
 * O salabtech.com faz PATCH /fieldops/visits/:id/status quando uma OS muda.
 */

import * as db from "./db";

// URL do salabtech.com (app de serviço)
const SALABTECH_URL = "https://www.salabtech.com";
const PORTAL_VISITS_URL = process.env.PORTAL_FIELD_INTEGRATION_URL || "https://salabportal-f7lzvyia.manus.space/api/integrations/field-app/visits";

// Token de autenticação para o webhook do salabtech.com
// Usa a mesma chave BUILT_IN_FORGE_API_KEY que já é compartilhada entre os apps
function getSyncToken(): string {
  return process.env.BUILT_IN_FORGE_API_KEY || process.env.VITE_FRONTEND_FORGE_API_KEY || "";
}

function getPortalWebhookSecret(): string {
  return process.env.FIELD_APP_WEBHOOK_SECRET || "";
}

function mapVisitStatusToPortal(status: string): string {
  const map: Record<string, string> = {
    agendado: "scheduled",
    em_andamento: "in_progress",
    concluido: "completed",
    cancelado: "cancelled",
  };
  return map[status] || "scheduled";
}

function mapVisitTypeToPortal(visitType: string): string {
  const map: Record<string, string> = {
    manutencao_preventiva: "maintenance",
    manutencao_corretiva: "maintenance",
    consultoria: "consulting",
    treinamento: "training",
  };
  return map[visitType] || "maintenance";
}

/**
 * Envia a visita diretamente ao Portal do Cliente. O vínculo é determinado
 * exclusivamente pelo CNPJ do cliente. Equipamento não participa do vínculo de visitas.
 */
export async function pushVisitToPortal(visit: any): Promise<{ success: boolean; visitId?: string; error?: string }> {
  const webhookSecret = getPortalWebhookSecret();
  if (!webhookSecret) {
    return { success: false, error: "FIELD_APP_WEBHOOK_SECRET não configurado" };
  }

  const client = visit.clientId ? await db.getClientById(visit.clientId) : null;
  const clientCnpj = String(client?.cnpj || "").replace(/\D/g, "");
  if (!clientCnpj) {
    const error = "Visita sem CNPJ do cliente; não enviada ao Portal.";
    await db.createSyncLog({ visitId: visit.id, direction: "push", action: "portal_visit", status: "error", payload: JSON.stringify({ externalVisitId: `FIELDOPS-${visit.id}` }), errorMessage: error });
    return { success: false, error };
  }

  const payload = {
    externalVisitId: `FIELDOPS-${visit.id}`,
    clientCnpj,
    clientName: client?.companyName || visit.clientName,
    title: visit.description || `Visita ${visit.visitType || "técnica"}`,
    description: visit.description || undefined,
    scheduledDate: visit.visitDate ? new Date(visit.visitDate).toISOString() : undefined,
    endDate: visit.endDate ? new Date(visit.endDate).toISOString() : undefined,
    technicianName: visit.employeeName || undefined,
    transportMode: visit.transportMode || undefined,
    status: mapVisitStatusToPortal(visit.status),
    visitType: mapVisitTypeToPortal(visit.visitType),
  };

  try {
    const response = await fetch(PORTAL_VISITS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-field-webhook-secret": webhookSecret,
      },
      body: JSON.stringify(payload),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = data.error || `HTTP ${response.status}`;
      await db.createSyncLog({ visitId: visit.id, direction: "push", action: "portal_visit", status: "error", payload: JSON.stringify(payload), errorMessage: error });
      return { success: false, error };
    }
    await db.createSyncLog({ visitId: visit.id, direction: "push", action: "portal_visit", status: "success", payload: JSON.stringify(payload), response: JSON.stringify(data) });
    return { success: true, visitId: data.visitId };
  } catch (error: any) {
    const message = String(error?.message || error);
    await db.createSyncLog({ visitId: visit.id, direction: "push", action: "portal_visit", status: "error", payload: JSON.stringify(payload), errorMessage: message });
    return { success: false, error: message };
  }
}

/**
 * Envia uma visita recém-criada ou atualizada para o salabtech.com.
 * O salabtech.com vai criar/atualizar uma Ordem de Serviço vinculada.
 */
export async function pushVisitToSalabtech(visit: any): Promise<{ success: boolean; orderNumber?: string; error?: string }> {
  const token = getSyncToken();
  if (!token) {
    console.warn("[Sync] No API key configured for salabtech.com sync");
    return { success: false, error: "No API key" };
  }

  // Buscar equipamentos vinculados à visita (por TAG)
  let equipmentTag = "";
  try {
    const visitEquip = await db.getVisitEquipment(visit.id);
    if (visitEquip && visitEquip.length > 0 && visitEquip[0].tag) {
      equipmentTag = visitEquip[0].tag;
    }
  } catch (e) {
    // Non-fatal: sync without equipment tag
  }

  // Mapear tipo de visita para maintenanceTypeId do salabtech.com
  const maintenanceTypeMap: Record<string, number> = {
    manutencao_preventiva: 1, // basic
    manutencao_corretiva: 4,  // corrective
    consultoria: 2,           // preventive (closest match)
    treinamento: 2,           // preventive
  };

  const payload = {
    equipmentTag: equipmentTag || "SEM-TAG",
    maintenanceTypeId: maintenanceTypeMap[visit.visitType] || 1,
    description: `Visita FieldOps #${visit.id}: ${visit.clientName} — ${visit.description || ""}`.trim(),
    visitId: String(visit.id),
    scheduledDate: visit.visitDate ? new Date(visit.visitDate).toISOString() : undefined,
  };

  try {
    const response = await fetch(`${SALABTECH_URL}/api/webhooks/agendamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok) {
      // Log error
      await db.createSyncLog({
        visitId: visit.id,
        direction: "push",
        action: "create",
        status: "error",
        payload: JSON.stringify(payload),
        errorMessage: data.error || `HTTP ${response.status}`,
      });
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    // Log success
    await db.createSyncLog({
      visitId: visit.id,
      direction: "push",
      action: "create",
      status: "success",
      payload: JSON.stringify(payload),
      response: JSON.stringify(data),
    });

    return { success: true, orderNumber: data.orderNumber };
  } catch (error: any) {
    await db.createSyncLog({
      visitId: visit.id,
      direction: "push",
      action: "create",
      status: "error",
      payload: JSON.stringify(payload),
      errorMessage: String(error?.message || error),
    });
    return { success: false, error: String(error?.message || error) };
  }
}

/**
 * Envia atualização de status de visita para o salabtech.com.
 * (Quando o FieldOps muda o status, notifica o salabtech.com)
 */
export async function pushStatusToSalabtech(visitId: number, status: string): Promise<{ success: boolean; error?: string }> {
  const token = getSyncToken();
  if (!token) {
    return { success: false, error: "No API key" };
  }

  // Mapear status FieldOps → salabtech.com
  const statusMap: Record<string, string> = {
    agendado: "scheduled",
    em_andamento: "in_progress",
    concluido: "completed",
    cancelado: "cancelled",
  };

  const salabtechStatus = statusMap[status] || "scheduled";

  try {
    const response = await fetch(`${SALABTECH_URL}/api/webhooks/visit-status/${visitId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      await db.createSyncLog({
        visitId,
        direction: "push",
        action: "status_update",
        status: "error",
        payload: JSON.stringify({ status: salabtechStatus }),
        errorMessage: data.error || `HTTP ${response.status}`,
      });
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    await db.createSyncLog({
      visitId,
      direction: "push",
      action: "status_update",
      status: "success",
      payload: JSON.stringify({ status: salabtechStatus }),
      response: JSON.stringify(data),
    });

    return { success: true };
  } catch (error: any) {
    await db.createSyncLog({
      visitId,
      direction: "push",
      action: "status_update",
      status: "error",
      errorMessage: String(error?.message || error),
    });
    return { success: false, error: String(error?.message || error) };
  }
}

/**
 * Busca o histórico de sincronização.
 */
export async function getSyncHistory(limit: number = 50) {
  return db.getSyncLogs(limit);
}
