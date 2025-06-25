import { WebSocket } from "ws";

export class ConnectionManager {
  private socketMeta = new Map<WebSocket, Record<string, any>>();

  constructor(private options?: any) {}

  public to(socket: WebSocket) {
    return {
      signal: (event: string, data: any) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event, data }));
        }
        return this;
      },
      store: (data: Record<string, any>) => {
        const existing = this.socketMeta.get(socket) || {};
        this.socketMeta.set(socket, { ...existing, ...data });
        return this;
      },
      get: (): Record<string, any> | undefined => {
        return this.socketMeta.get(socket);
      },
    };
  }

  public get(socket: WebSocket): Record<string, any> | undefined {
    return this.socketMeta.get(socket);
  }

  public store(socket: WebSocket, data: Record<string, any>) {
    const existing = this.socketMeta.get(socket) || {};
    this.socketMeta.set(socket, { ...existing, ...data });
  }

  public cleanup(socket: WebSocket) {
    this.socketMeta.delete(socket);
  }
}