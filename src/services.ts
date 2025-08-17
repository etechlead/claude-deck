import type { Service, Slot } from "./types.js";

// In-memory registries
export const services = new Map<string, Service>();
export const slotsFree: Slot[] = [];
export const slotByContext = new Map<string, Slot>();

export function clearServiceAnimation(service: Service) {
  if (service.animationTimer) {
    clearInterval(service.animationTimer);
    service.animationTimer = undefined;
  }
}

export function unbindServiceFromSlot(serviceId: string, context: string) {
  const service = services.get(serviceId);
  if (service && service.assignedContext === context) {
    clearServiceAnimation(service);
    service.assignedContext = undefined;
  }
}

export function clearServiceFromSlot(serviceId: string, context: string) {
  const service = services.get(serviceId);
  if (service && service.assignedContext === context) {
    clearServiceAnimation(service);
    service.assignedContext = undefined;
    service.state = "idle";
    const slot = slotByContext.get(context);
    if (slot) {
      slotsFree.push(slot);
    }
  }
}

export function findServiceByContext(context: string): Service | undefined {
  return [...services.values()].find((s) => s.assignedContext === context);
}

export function getOrCreateService(id: string, name: string): Service {
  let service = services.get(id);
  if (!service) {
    service = { id, name, state: "idle" };
    services.set(id, service);
  } else {
    service.name = name;
  }
  return service;
}

export function assignServiceToSlot(service: Service): Slot | null {
  if (service.assignedContext) {
    return slotByContext.get(service.assignedContext) || null;
  }
  
  if (!slotsFree.length) {
    return null;
  }
  
  const slot = slotsFree.shift()!;
  service.assignedContext = slot.context;
  return slot;
}