import { WebSocket } from "ws";

export class TagManager {
  private socketMeta = new Map<WebSocket, Record<string, any>>();

  public add(socket: WebSocket, tags: string[]) {
    const meta = this.socketMeta.get(socket) || {};
    const currentTags = new Set(meta.tags || []);
    tags.forEach((tag) => currentTags.add(tag));
    this.socketMeta.set(socket, { ...meta, tags: Array.from(currentTags) });
  }

  public has(socket: WebSocket, tag: string): boolean {
    const meta = this.socketMeta.get(socket);
    return meta?.tags?.includes(tag) || false;
  }

  public find(tag: string): WebSocket[] {
    const result: WebSocket[] = [];
    this.socketMeta.forEach((meta, socket) => {
      if (meta.tags?.includes(tag)) result.push(socket);
    });
    return result;
  }

  public getAll(socket: WebSocket): string[] {
    return this.socketMeta.get(socket)?.tags || [];
  }
}