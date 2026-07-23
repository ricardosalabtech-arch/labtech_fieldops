import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ─── FieldOps ↔ salabtech.com Integration Endpoints ─────────────────────────
  // Bearer token auth middleware for FieldOps integration
  function fieldOpsAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const auth = req.headers.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    // Accept VITE_FRONTEND_FORGE_API_KEY or BUILT_IN_FORGE_API_KEY as valid tokens
    const validTokens = [
      process.env.VITE_FRONTEND_FORGE_API_KEY,
      process.env.BUILT_IN_FORGE_API_KEY,
    ].filter(Boolean);
    if (!token || !validTokens.includes(token)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  }

  // Map FieldOps status → salabtech.com status
  function mapStatusToSalabtech(status: string): string {
    const map: Record<string, string> = {
      agendado: "scheduled",
      em_andamento: "in_progress",
      concluido: "completed",
      cancelado: "cancelled",
    };
    return map[status] ?? "scheduled";
  }

  // Map salabtech.com status → FieldOps status
  function mapStatusFromSalabtech(status: string): string {
    const map: Record<string, string> = {
      scheduled: "agendado",
      in_progress: "em_andamento",
      completed: "concluido",
      cancelled: "cancelado",
    };
    return map[status] ?? "agendado";
  }

  // GET /fieldops/visits — returns visits for salabtech.com agenda
  app.get("/fieldops/visits", fieldOpsAuth, async (req, res) => {
    try {
      const allVisits = await db.getVisits();
      const visits = allVisits.map((v) => ({
        id: String(v.id),
        date: v.visitDate ? new Date(v.visitDate).toISOString().split("T")[0] : "",
        time: v.scheduledTime ?? "08:00",
        clientName: v.clientName,
        clientId: v.clientId ?? undefined,
        equipmentName: "", // FieldOps identifies by TAG/serial — no single equipmentName
        maintenanceType: v.visitType ?? "manutencao_preventiva",
        technician: v.employeeName ?? undefined,
        status: mapStatusToSalabtech(v.status),
        notes: v.notes ?? undefined,
        fieldOpsUrl: `${req.protocol}://${req.get("host")}/agendamentos`,
        gpsLat: v.latitude ? parseFloat(v.latitude) : undefined,
        gpsLon: v.longitude ? parseFloat(v.longitude) : undefined,
        transportMode: v.transportMode ?? undefined,
        address: v.address,
        city: v.city,
        state: v.state ?? undefined,
        tripId: v.tripId ?? undefined,
        description: v.description ?? undefined,
      }));
      res.json({ visits, total: visits.length, syncedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[FieldOps] GET /fieldops/visits error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PATCH /fieldops/visits/:id/status — receives status update from salabtech.com
  app.patch("/fieldops/visits/:id/status", fieldOpsAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid visit ID" }); return; }
      const { status, serviceOrderId } = req.body as { status?: string; serviceOrderId?: number };
      if (!status) { res.status(400).json({ error: "status is required" }); return; }
      const fieldOpsStatus = mapStatusFromSalabtech(status);
      const updated = await db.updateVisit(id, {
        status: fieldOpsStatus as any,
        notes: serviceOrderId ? `OS #${serviceOrderId} (salabtech.com)` : undefined,
      });
      if (!updated) { res.status(404).json({ error: "Visit not found" }); return; }
      res.json({ success: true, id, status: fieldOpsStatus, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[FieldOps] PATCH /fieldops/visits/:id/status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────────
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
