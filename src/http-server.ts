import express from "express";
import z from "zod";
import streamDeck from "@elgato/streamdeck";
import { HTTP_PORT } from "./config.js";
import { services, slotByContext, slotsFree, getOrCreateService, assignServiceToSlot, clearServiceAnimation } from "./services.js";
import { paintRunning, paintDone, paintFailed } from "./renderer.js";

// Create scoped logger
const httpLogger = streamDeck.logger.createScope("HTTP");
const serviceLogger = streamDeck.logger.createScope("Services");

// Validation schemas
const StartSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });
const FinishSchema = z.object({ id: z.string().min(1), ok: z.boolean().default(true) });

// HTTP server state
let serverStarted = false;
let app = express();
let httpServer: import("http").Server | null = null;

export async function startOrRestartHttp() {
  httpLogger.info("Starting HTTP server setup...");
  
  try {
    httpLogger.info(`Using HTTP port: ${HTTP_PORT}`);

    if (serverStarted) {
      httpLogger.info("Stopping existing server...");
      await new Promise<void>((res) => httpServer?.close(() => res()));
      serverStarted = false;
      httpLogger.info("Existing server stopped");
    }

    app = express();
    app.use(express.json());

    app.get("/slots", (_req, res) => {
      httpLogger.debug("GET /slots request received");
      const payload = {
        port: HTTP_PORT,
        total: slotByContext.size,
        free: slotsFree.length,
        busy: [...services.values()].filter((s) => !!s.assignedContext).map((s) => ({ id: s.id, name: s.name, state: s.state }))
      };
      res.json(payload);
    });

    app.post("/start", async (req, res) => {
      try {
        const parse = StartSchema.safeParse(req.body);
        if (!parse.success) {
          httpLogger.warn("Invalid start request:", parse.error.flatten());
          return res.status(400).json({ error: parse.error.flatten() });
        }
        const { id, name } = parse.data;

        httpLogger.info(`Starting service: ${id} (${name})`);

        const svc = getOrCreateService(id, name);
        if (svc === services.get(id)) {
          serviceLogger.debug(`Reusing existing service: ${id}`);
        } else {
          serviceLogger.debug(`Created new service: ${id}`);
        }

        const slot = assignServiceToSlot(svc);
        if (!slot) {
          httpLogger.warn("No free Stream Deck slots available");
          return res.status(409).json({ error: "No free Stream Deck slots" });
        }

        if (svc.assignedContext) {
          serviceLogger.info(`Assigned service ${id} to slot ${svc.assignedContext}`);
        }

        svc.state = "running";
        await paintRunning(slot, svc.name, svc);

        return res.json({ ok: true, assignedContext: svc.assignedContext });
      } catch (error) {
        httpLogger.error("Error starting service:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/finish", async (req, res) => {
      try {
        const parse = FinishSchema.safeParse(req.body);
        if (!parse.success) {
          httpLogger.warn("Invalid finish request:", parse.error.flatten());
          return res.status(400).json({ error: parse.error.flatten() });
        }
        const { id, ok } = parse.data;

        httpLogger.info(`Finishing service: ${id} (${ok ? 'success' : 'failure'})`);

        const svc = services.get(id);
        if (!svc || !svc.assignedContext) {
          httpLogger.warn(`Service not found or not assigned: ${id}`);
          return res.status(404).json({ error: "Service not found or not assigned" });
        }

        const slot = slotByContext.get(svc.assignedContext)!;

        // Clear animation timer when finishing
        clearServiceAnimation(svc);

        if (ok) {
          svc.state = "completed";
          serviceLogger.info(`Service ${id} completed successfully`);
          await paintDone(slot, svc.name);
          await slot.showOk();
        } else {
          svc.state = "failed";
          serviceLogger.warn(`Service ${id} failed`);
          await paintFailed(slot, svc.name);
          await slot.showAlert();
        }

        return res.json({ ok: true });
      } catch (error) {
        httpLogger.error("Error finishing service:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    httpLogger.info(`Attempting to start HTTP server on port ${HTTP_PORT}...`);
    
    httpServer = app.listen(HTTP_PORT, () => {
      serverStarted = true;
      httpLogger.info(`HTTP server successfully started on http://127.0.0.1:${HTTP_PORT}`);
    });

    httpServer.on('error', (err: any) => {
      httpLogger.error(`HTTP server error: ${err.message}`);
      if (err.code === 'EADDRINUSE') {
        httpLogger.error(`Port ${HTTP_PORT} is already in use.`);
      }
      serverStarted = false;
    });

    httpServer.on('listening', () => {
      const addr = httpServer?.address();
      httpLogger.info(`Server is listening on ${JSON.stringify(addr)}`);
    });
    
  } catch (error) {
    httpLogger.error("Failed to start HTTP server:", error);
    throw error;
  }
}