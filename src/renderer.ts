import type { Service, Slot } from "./types.js";
import { ANIMATION_FRAMES, ANIMATION_FRAME_DURATION } from "./config.js";

export function paintIdle(slot: Slot) {
  slot.setTitle(""); // Clear the title when going to idle state
  return slot.setImage("imgs/states/idle.svg");
}

export function paintRunning(slot: Slot, name: string, service: Service) {
  slot.setTitle(name);
  
  // Clear any existing animation timer
  if (service.animationTimer) {
    clearInterval(service.animationTimer);
  }
  
  // Initialize animation frame and direction
  service.animationFrame = service.animationFrame || 1;
  service.animationDirection = service.animationDirection || 1;
  
  // Start animation cycling
  const updateFrame = () => {
    const frameNumber = service.animationFrame || 1;
    slot.setImage(`imgs/states/running-${frameNumber}.svg`);
    
    // Ping-pong animation: 1→2→3→4→5→6→5→4→3→2→1→2→...
    const direction = service.animationDirection || 1;
    let nextFrame = frameNumber + direction;
    
    // Change direction at boundaries
    if (nextFrame > ANIMATION_FRAMES) {
      service.animationDirection = -1;
      nextFrame = ANIMATION_FRAMES - 1; // Go back one frame from max
    } else if (nextFrame < 1) {
      service.animationDirection = 1;
      nextFrame = 2; // Go forward to frame 2
    }
    
    service.animationFrame = nextFrame;
  };
  
  // Set initial frame
  updateFrame();
  
  // Set up timer for animation using configurable duration
  service.animationTimer = setInterval(updateFrame, ANIMATION_FRAME_DURATION);
  
  return Promise.resolve();
}

export function paintDone(slot: Slot, name: string) {
  slot.setTitle(name);
  return slot.setImage("imgs/states/completed.svg");
}

export function paintFailed(slot: Slot, name: string) {
  slot.setTitle(name);
  return slot.setImage("imgs/states/completed.svg"); // Use same image for failed state
}