import { WebSocket } from "ws";

export class RateLimiter {
  private rateLimitState = new Map<WebSocket, { count: number; lastReset: number }>();
  private throttleQueues = new Map<WebSocket, string[]>();
  private processingThrottle = new Set<WebSocket>();

  constructor(private options?: any) {}

  public passes(ws: WebSocket): boolean {
    const max = this.options?.rateLimit?.maxPerSecond;
    if (!max) return true;

    const now = Date.now();
    const state = this.rateLimitState.get(ws) || { count: 0, lastReset: now };

    if (now - state.lastReset > 1000) {
      state.count = 1;
      state.lastReset = now;
    } else {
      state.count += 1;
    }

    this.rateLimitState.set(ws, state);
    return state.count <= max;
  }

  public enqueue(ws: WebSocket, message: string, handler: (msg: string) => void) {
    const queue = this.throttleQueues.get(ws) || [];
    queue.push(message);
    this.throttleQueues.set(ws, queue);

    if (!this.processingThrottle.has(ws)) {
      this.processingThrottle.add(ws);
      this.processThrottleQueue(ws, handler);
    }
  }

  private processThrottleQueue(ws: WebSocket, handler: (msg: string) => void) {
    const interval = 1000 / (this.options?.rateLimit?.maxPerSecond || 1);

    const processNext = () => {
      const queue = this.throttleQueues.get(ws);
      if (!queue || queue.length === 0) {
        this.processingThrottle.delete(ws);
        return;
      }

      const msg = queue.shift();
      if (msg && ws.readyState === WebSocket.OPEN) {
        handler(msg);
      }

      setTimeout(processNext, interval);
    };

    processNext();
  }

  public cleanup(ws: WebSocket) {
    this.rateLimitState.delete(ws);
    this.throttleQueues.delete(ws);
    this.processingThrottle.delete(ws);
  }
}