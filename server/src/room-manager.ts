import { WebSocket } from "ws";

export class RoomManager {
  private roomMap = new Map<string, Set<WebSocket>>();

  constructor(private options?: any) {}

  public join(socket: WebSocket, room: string) {
    let members = this.roomMap.get(room);
    if (!members) {
      members = new Set();
      this.roomMap.set(room, members);
      this.options?.onRoomStart?.(room);
    }
    if (!members.has(socket)) {
      members.add(socket);
      this.options?.onRoomJoin?.(room, socket);
    }
  }

  public leave(socket: WebSocket, room: string) {
    const members = this.roomMap.get(room);
    if (members) {
      members.delete(socket);
      this.options?.onRoomLeave?.(room, socket);
      if (members.size === 0) {
        this.roomMap.delete(room);
        this.options?.onRoomDestroy?.(room);
      }
    }
  }

  public leaveAll(socket: WebSocket) {
    for (const [room, members] of this.roomMap.entries()) {
      if (members.has(socket)) {
        members.delete(socket);
        this.options?.onRoomLeave?.(room, socket);
        if (members.size === 0) {
          this.roomMap.delete(room);
          this.options?.onRoomDestroy?.(room);
        }
      }
    }
  }

  public get(room: string): Set<WebSocket> | undefined {
    return this.roomMap.get(room);
  }

  public getAll(): string[] {
    return Array.from(this.roomMap.keys());
  }

  public broadcast(room: string, message: string) {
    const members = this.roomMap.get(room);
    if (!members) return;
    for (const socket of members) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }
}