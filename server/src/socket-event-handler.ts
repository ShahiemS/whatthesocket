import { WebSocket } from "ws";

type EventHandler = (data: any, socket: WebSocket) => void;

export class SocketEventHandler {
  private events = new Map<string, EventHandler>();

  public on(event: string, handler: EventHandler) {
    this.events.set(event, handler);
  }

  public handle(raw: string, socket: WebSocket) {
    try {
      const msg = JSON.parse(raw);
      const handler = this.events.get(msg.event);
      if (handler) {
        handler(msg.data, socket);
      } else {
        console.warn(`No handler registered for event: ${msg.event}`);
      }
    } catch (err) {
      console.error("Invalid message format:", err);
    }
  }

  public format(event: string, data: any) {
    return JSON.stringify({ event, data });
  }
}
