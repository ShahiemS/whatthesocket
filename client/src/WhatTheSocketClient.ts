type MessageHandler = (data: any) => void;

interface ClientOptions {
  url: string;
  autoConnect?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  onReconnectAttempt?: (attempt: number) => void;
  onReconnectFailed?: () => void;
  onReconnected?: () => void;
  id?: string;
  reconnectStrategy?: (attempt: number) => number;
  maxAttempts?: number;
  cooldown?: number;
}

export class WhatTheSocketClient {
  private socket: WebSocket | null = null;
  private options: ClientOptions;
  private listeners = new Map<string, MessageHandler>();

  private reconnectAttempts = 0;
  private reconnecting = false;
  private isManualClose = false;
  private reconnectTimeout?: number;
  private lastConnectedTime: number = Date.now();

  constructor(options: ClientOptions) {
    this.options = options;
    this.attachNetworkListeners();

    if (options.autoConnect !== false) this.connect(); // Automatically connect unless its disabled
  }

  // Listen for the browser coming back online to trigger a reconnect attempt
  private attachNetworkListeners() {
    window.addEventListener("online", () => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.reconnect();
      }
    });
  }

  // Attempt to reconnect the WebSocket based on provided strategy and limits
  private reconnect() {
    if (this.reconnecting || this.isManualClose) return;

    const now = Date.now();
    // Reset attempts if cooldown has passed
    if (
      this.options.cooldown &&
      now - this.lastConnectedTime > this.options.cooldown
    ) {
      this.reconnectAttempts = 0;
    }

    // Stop if max reconnect attempts are reached
    if (
      this.options.maxAttempts !== undefined &&
      this.reconnectAttempts >= this.options.maxAttempts
    ) {
      this.options.onReconnectFailed?.();
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;
    this.options.onReconnectAttempt?.(this.reconnectAttempts);

    // Calculate delay using custom strategy or default exponential backoff
    const delay =
      this.options.reconnectStrategy?.(this.reconnectAttempts) ??
      Math.min(this.reconnectAttempts * 1000, 10000);

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnecting = false;
      this.connect(); // Try to re-establish connection
    }, delay);
  }

  // Establish a new WebSocket connection and set up its event handlers
  public connect() {
    this.clearReconnectTimer(); // Clear any pending reconnect attempts
    this.isManualClose = false;

    this.socket = new WebSocket(this.options.url);

    this.socket.addEventListener("open", () => {
      this.lastConnectedTime = Date.now();
      this.reconnectAttempts = 0;
      this.options.onOpen?.();
      this.options.onReconnected?.();

      // Optionally send reconnection ID to server
      if (this.options.id) {
        this.send("reconnect", { id: this.options.id });
      }
    });

    this.socket.addEventListener("message", (event) => {
      try {
        const { event: evt, data } = JSON.parse(event.data);
        this.listeners.get(evt)?.(data); // Trigger registered handler for the event
      } catch (err) {
        console.error("Invalid message:", event.data);
      }
    });

    this.socket.addEventListener("close", () => {
      this.options.onClose?.();
      this.reconnect(); // Attempt to reconnect on unexpected close
    });

    this.socket.addEventListener("error", (err) => {
      this.options.onError?.(err);
    });
  }

  // Register a handler for a specific event
  public on(event: string, handler: MessageHandler) {
    this.listeners.set(event, handler);
  }

  // Send a message to the server if the connection is open
  public send(event: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  // Manually close the connection and stop reconnect attempts
  public close() {
    this.isManualClose = true;
    this.clearReconnectTimer();
    this.socket?.close();
  }

  // Clear any active reconnect timers
  private clearReconnectTimer() {
    if (this.reconnectTimeout !== undefined) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }
}
