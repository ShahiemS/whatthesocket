import { WhatTheSocketClient } from "./WhatTheSocketClient";

const log = document.getElementById("log") as HTMLTextAreaElement | null;
const input = document.getElementById("message") as HTMLInputElement | null;
const sendBtn = document.getElementById("send") as HTMLButtonElement | null;
const joinBtn = document.getElementById("join") as HTMLButtonElement | null;
const leaveBtn = document.getElementById("leave") as HTMLButtonElement | null;
const roomInput = document.getElementById("room") as HTMLInputElement | null;

const storedId = localStorage.getItem("userId");

const client = new WhatTheSocketClient({
  url: "ws://localhost:3001",
  autoConnect: true,
  id: storedId ?? undefined,
  maxAttempts: 2,
  reconnectStrategy: (attempt) => Math.min(1000 * 2 ** attempt, 8000),

  onOpen: () => {
    appendLog("✅ Connected to server\n");

    let count = 0;
    const interval = setInterval(() => {
      count++;
      const event = "test";
      const data = { index: count, time: new Date().toISOString() };

      client.send(event, data); // ✅ correct usage

      console.log(`Sent message #${count}`);

      if (count >= 20) clearInterval(interval);
    }, 10); // 10 messages/sec
  },

  onClose: () => {
    appendLog("⚠️ Disconnected. Attempting to reconnect...\n");
  },

  onError: (err) => {
    console.error("Socket error", err);
  },
});

client.on("connected", (data) => {
  localStorage.setItem("userId", data.userId);
  appendLog(`🆔 Connected as: ${data.userId}\n`);
});

client.on("chat", (msg) => {
  appendLog(`${msg.from}: ${msg.text}\n`);
});

client.on("roomJoined", (data) => {
  appendLog(`🏠 Joined room: ${data.room}\n`);
});

client.on("roomLeft", (data) => {
  appendLog(`👋 Left room: ${data.room}\n`);
});

sendBtn?.addEventListener("click", () => {
  if (!input?.value.trim()) return;
  client.send("chat", { text: input.value });
  input.value = "";
});

joinBtn?.addEventListener("click", () => {
  if (!roomInput?.value.trim()) return;
  client.send("joinRoom", { room: roomInput.value });
});

leaveBtn?.addEventListener("click", () => {
  if (!roomInput?.value.trim()) return;
  client.send("leaveRoom", { room: roomInput.value });
});

function appendLog(message: string) {
  if (!log) return;
  log.value += message;
  log.scrollTop = log.scrollHeight;
}

document.getElementById("joinGame")?.addEventListener("click", () => {
  client.send("joinGame", {});
});

document.getElementById("drawTile")?.addEventListener("click", () => {
  client.send("drawTile", {});
});
client.on("test-reply", (data) => {
  appendLog(`✅ Reply for #${data.index} at ${data.time}\n`);
});
