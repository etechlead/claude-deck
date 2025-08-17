import streamDeck, {
  action,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
  type KeyUpEvent,
} from "@elgato/streamdeck";

import type { Slot } from "./types.js";
import { 
  services, 
  slotsFree, 
  slotByContext, 
  findServiceByContext, 
  unbindServiceFromSlot, 
  clearServiceFromSlot 
} from "./services.js";
import { paintIdle, paintRunning, paintDone, paintFailed } from "./renderer.js";
import { startOrRestartHttp } from "./http-server.js";

// Initialize logging - the SDK will automatically handle file logging
streamDeck.logger.info("Plugin file is being loaded...");
streamDeck.logger.debug("Plugin starting to load from directory:", __dirname);

// Create scoped logger for slots
const slotLogger = streamDeck.logger.createScope("Slots");

// -----------------------------
// Action: a single slot key
// -----------------------------

@action({ UUID: "pro.clever.claudedeck.slot" })
class ServiceSlot extends SingletonAction {
  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    const context = ev.action.id;
    slotLogger.debug(`Slot appearing with context: ${context}`);
    
    const slot: Slot = {
      context,
      setTitle: (t?: string) => ev.action.setTitle(t ?? ""),
      setImage: (imagePath?: string) => ev.action.setImage(imagePath),
      showOk: () => Promise.resolve(), // showOk might not be available
      showAlert: () => Promise.resolve(), // showAlert might not be available
    };

    slotByContext.set(context, slot);

    // If some service was previously bound to this context, keep it. Otherwise mark free.
    const existing = findServiceByContext(context);
    if (!existing) {
      slotsFree.push(slot);
      slotLogger.debug(`Slot ${context} added to free pool`);
      await paintIdle(slot);
    } else {
      slotLogger.debug(`Slot ${context} reconnecting to service ${existing.id} (${existing.state})`);
      // Repaint according to its state
      if (existing.state === "running") await paintRunning(slot, existing.name, existing);
      else if (existing.state === "completed") await paintDone(slot, existing.name);
      else if (existing.state === "failed") await paintFailed(slot, existing.name);
      else await paintIdle(slot);
    }
  }

  override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
    const context = ev.action.id;
    slotLogger.debug(`Slot disappearing with context: ${context}`);
    
    // Remove from free list if present
    const idx = slotsFree.findIndex((s) => s.context === context);
    if (idx >= 0) {
      slotsFree.splice(idx, 1);
      slotLogger.debug(`Slot ${context} removed from free pool`);
    }

    // Unbind any service tied to this context
    for (const s of services.values()) {
      if (s.assignedContext === context) {
        slotLogger.debug(`Unbinding service ${s.id} from slot ${context}`);
        unbindServiceFromSlot(s.id, context);
      }
    }
    slotByContext.delete(context);
  }

  override async onKeyUp(ev: KeyUpEvent): Promise<void> {
    const context = ev.action.id;
    slotLogger.debug(`Key pressed on slot ${context}`);
    
    // If a service is bound here and is completed/failed/running, clear it.
    const bound = findServiceByContext(context);
    if (bound) {
      slotLogger.info(`Clearing service ${bound.id} from slot ${context}`);
      clearServiceFromSlot(bound.id, context);
      await paintIdle(slotByContext.get(context)!);
      // No showOk call since it might not be available
    } else {
      slotLogger.debug(`No service bound to slot ${context}, repainting idle`);
      // Nothing bound -> just repaint idle
      await paintIdle(slotByContext.get(context)!);
    }
  }
}

// Register and connect the plugin
streamDeck.logger.info("Registering ServiceSlot action...");
streamDeck.actions.registerAction(new ServiceSlot());
streamDeck.logger.info("ServiceSlot action registered successfully");

// Kick off the connection (then bootstrap the HTTP server)
streamDeck.logger.info("Plugin starting, connecting to Stream Deck...");
streamDeck.connect().then(() => {
  streamDeck.logger.info("Connected to Stream Deck, starting HTTP server...");
  return startOrRestartHttp();
}).catch((err) => {
  streamDeck.logger.error("Failed to connect to Stream Deck:", err.message);
});