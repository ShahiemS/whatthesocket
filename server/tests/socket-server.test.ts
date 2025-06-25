import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws"; // Use real WebSocket in Node
import { WhatTheSocketServer } from "../src/socket-server"; // Adjust path

const PORT = 1234;
const WS_URL = `ws://localhost:${PORT}`;

describe("WhatTheSocketServer", () => {
  let server: WhatTheSocketServer;

  afterEach(() => {
    server?.stop(); // Close server after each test
  });

  it("should start the WebSocket server", () => {
    server = new WhatTheSocketServer(PORT);
    expect(server).toBeDefined();
  });

  it("should handle a connection", async () => {
    const connectSpy = vi.fn();
    server = new WhatTheSocketServer(PORT, { onConnect: connectSpy });

    const socket = new WebSocket(WS_URL);
    await new Promise((resolve) => socket.once("open", resolve));

    expect(connectSpy).toHaveBeenCalled();
    socket.close();
  }, 10000); // <- optional timeout increase
});
