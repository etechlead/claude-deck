export type ServiceState = "idle" | "running" | "completed" | "failed";

export type Service = {
  id: string;
  name: string;
  state: ServiceState;
  assignedContext?: string; // context of the slot key
  animationFrame?: number; // current animation frame for running state
  animationDirection?: 1 | -1; // 1 for forward, -1 for backward
  animationTimer?: NodeJS.Timeout; // timer for animation cycling
};

export type Slot = {
  context: string;               // Stream Deck context for this key
  setTitle: (t?: string) => Promise<void>;
  setImage: (svg?: string) => Promise<void>;
  showOk: () => Promise<void>;
  showAlert: () => Promise<void>;
};