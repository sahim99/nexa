import { ActivityEvent } from '@nexa/shared';

// For this initial implementation, we'll use an in-memory event bus.
// In a scalable production system, this could be backed by Redis Pub/Sub, Kafka, or SSE.

type EventHandler = (event: ActivityEvent) => void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private history: ActivityEvent[] = []; // In-memory history for quick polling

  /**
   * Subscribe to specific event types, or '*' for all events.
   */
  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    this.handlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  emit(event: ActivityEvent): void {
    this.history.push(event);
    
    // Keep history bounded to last 1000 events to prevent memory leaks
    if (this.history.length > 1000) {
      this.history.shift();
    }

    // Call exact match handlers
    if (this.handlers.has(event.eventType)) {
      for (const handler of this.handlers.get(event.eventType)!) {
        try {
          handler(event);
        } catch (e) {
          console.error(`Error in event handler for ${event.eventType}:`, e);
        }
      }
    }

    // Call catch-all handlers
    if (this.handlers.has('*')) {
      for (const handler of this.handlers.get('*')!) {
        try {
          handler(event);
        } catch (e) {
          console.error(`Error in wildcard event handler:`, e);
        }
      }
    }
  }

  /**
   * Get recent events (useful for UI initial load before WebSocket connection).
   */
  getRecentEvents(limit: number = 50): ActivityEvent[] {
    return this.history.slice(-limit);
  }
}
