import { WebSocketServer, WebSocket } from "ws";
import chalk from "chalk";
import crypto from "crypto";
import { ConnectionManager } from "./connection-manager";
import { RateLimiter } from "./rate-limiter";
import { RoomManager } from "./room-manager";
import { SocketEventHandler } from "./socket-event-handler";
import { TagManager } from "./tag-manager";

const userRooms = new Map<string, string[]>();
const userTags = new Map<string, string[]>();
const socketIds = new Map<WebSocket, string>();

interface WhatTheSocketOptions {
  onConnect?: (socket: WebSocket, ...args: any[]) => void;
  onClose?: (socket: WebSocket, ...args: any[]) => void;
  onStart?: () => void;
  onStop?: () => void;
  onRoomStart?: (room: string) => void;
  onRoomJoin?: (room: string, socket: WebSocket) => void;
  onRoomLeave?: (room: string, socket: WebSocket) => void;
  onRoomDestroy?: (room: string) => void;
  generateId?: () => string;
  rateLimit?: {
    maxPerSecond: number;
    throttle?: boolean;
  };
  debug?: boolean;
}

export class WhatTheSocketServer {
  private wss: WebSocketServer;
  private eventHandler = new SocketEventHandler();
  private generateIdFn: () => string;

  private connectionManager: ConnectionManager;
  private rateLimiter: RateLimiter;
  private roomManager: RoomManager;
  private tagManager: TagManager;

  constructor(
    private port: number = 3001,
    private options?: WhatTheSocketOptions
  ) {
    this.wss = new WebSocketServer({ port: this.port });
    this.generateIdFn =
      options?.generateId || (() => Math.random().toString(36).slice(2, 10));

    this.connectionManager = new ConnectionManager(this.options);
    this.rateLimiter = new RateLimiter(this.options);
    this.roomManager = new RoomManager(this.options);
    this.tagManager = new TagManager();

    this.initialize();
  }

  private initialize() {
    this.wss.on("connection", (ws: WebSocket) => {
      const socketId = crypto.randomUUID();
      socketIds.set(ws, socketId);

      this.to(ws).signal("welcome", { message: "Welcome to WhatTheSocket!" });
      this.log(ws, chalk.green("[Connection] New socket connected"));

      ws.on("message", (raw) => {
        const isAllowed = this.rateLimiter.passes(ws);

        if (!isAllowed) {
          this.log(
            ws,
            chalk.red("[RateLimit] Blocked message due to rate limit")
          );
          if (this.options?.rateLimit?.throttle) {
            this.rateLimiter.enqueue(ws, raw.toString(), (msg) =>
              this.eventHandler.handle(msg, ws)
            );
          } else {
            this.to(ws).signal("error", { message: "Rate limit exceeded" });
          }
          return;
        }

        this.log(ws, chalk.cyan(`[Message] ${raw.toString()}`));
        this.eventHandler.handle(raw.toString(), ws);
      });

      ws.on("close", () => {
        this.log(ws, chalk.yellow("[Disconnect] Socket disconnected"));
        const meta = this.get(ws);
        if (meta?.id) {
          const rooms: string[] = [];
          for (const room of this.roomManager.getAll()) {
            if (this.roomManager.get(room)?.has(ws)) {
              rooms.push(room);
            }
          }
          userRooms.set(meta.id, rooms);
          userTags.set(meta.id, this.tagManager.getAll(ws));
        }

        this.roomManager.leaveAll(ws);
        this.connectionManager.cleanup(ws);
        this.rateLimiter.cleanup(ws);
        socketIds.delete(ws);
      });
    });

    console.log(`🟢 Listening on ws://localhost:${this.port}`);
    this.registerBuiltInEvents();
  }

  private log(socket: WebSocket | null, message: string) {
    if (!this.options?.debug) return;
    const id = socket ? socketIds.get(socket) || "unknown" : "server";
    console.log(chalk.gray(`[Debug][${id}] `) + message);
  }

  public on(event: string, handler: (data: any, socket: WebSocket) => void) {
    this.eventHandler.on(event, handler);
  }

  public to(socket: WebSocket) {
    return this.connectionManager.to(socket);
  }

  public get(socket: WebSocket) {
    return this.connectionManager.get(socket);
  }

  public store(socket: WebSocket, data: Record<string, any>) {
    this.connectionManager.store(socket, data);
  }

  public joinRoom(socket: WebSocket, room: string) {
    this.roomManager.join(socket, room);
  }

  public leaveRoom(socket: WebSocket, room: string) {
    this.roomManager.leave(socket, room);
  }

  public leaveAllRooms(socket: WebSocket) {
    this.roomManager.leaveAll(socket);
  }

  public broadcastTo(room: string, event: string, data: any) {
    this.roomManager.broadcast(room, this.eventHandler.format(event, data));
  }

  public get rooms() {
    return this.roomManager;
  }

  public get tags() {
    return this.tagManager;
  }

  public generateId(): string {
    return this.generateIdFn();
  }

  public stop() {
    this.wss.close(() => {
      this.options?.onStop?.();
      console.log("🛑 Server closed");
    });
  }

  private registerBuiltInEvents() {
    this.on("reconnect", ({ id }, socket) => {
      if (!id) return;
      this.store(socket, { id });

      const rooms = userRooms.get(id) || [];
      rooms.forEach((room) => this.joinRoom(socket, room));

      const tags = userTags.get(id) || [];
      this.tags.add(socket, tags);

      this.to(socket).signal("session-restored", { id, rooms, tags });
    });

    this.on("join-room", ({ room, id }, socket) => {
      this.joinRoom(socket, room);
      if (id) {
        const current = userRooms.get(id) || [];
        if (!current.includes(room)) {
          userRooms.set(id, [...current, room]);
        }
      }
    });

    this.on("set-tags", ({ tags, id }, socket) => {
      this.tags.add(socket, tags);
      if (id) {
        userTags.set(id, tags);
      }
    });
  }
}
