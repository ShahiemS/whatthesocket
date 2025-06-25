import { WhatTheSocketServer } from "./socket-server";

const server = new WhatTheSocketServer(3001, {
  debug: false,
  onStart: () => {
    console.log("🚀 Server started at ws://localhost:3001");
  },

  onConnect: (socket: any) => {
    const userId = server.generateId();

    server.to(socket).store({ userId });
    server.to(socket).signal("connected", { userId });

    console.log(`🙋 Connected: ${userId}`);
  },

  onClose: (socket: any) => {
    const meta = server.get(socket);
    console.log(`👋 Disconnected: ${meta?.userId}`);
  },

  onStop: () => {
    console.log("🧯 Server stopped");
  },

  onRoomStart: (room: any) => {
    console.log(`🆕 Room created: ${room}`);
  },

  onRoomJoin: (room: any, socket: any) => {
    const meta = server.get(socket);
    console.log(`➕ ${meta?.userId} joined ${room}`);
  },

  onRoomLeave: (room: any, socket: any) => {
    const meta = server.get(socket);
    console.log(`➖ ${meta?.userId} left ${room}`);
  },

  onRoomDestroy: (room: any) => {
    console.log(`💥 Room destroyed: ${room}`);
  },
});

// 📩 Handle incoming messages

server.on("test", (data, socket) => {
  const meta = server.get(socket);
  console.log(`🧪 Received test #${data.index} from ${meta?.userId}`);
  server.to(socket).signal("test-reply", {
    index: data.index,
    time: new Date().toISOString(),
  });
});

server.on("chat", (data: { text: string }, socket: any) => {
  const meta = server.get(socket);
  const msg = {
    from: meta?.userId ?? "anon",
    text: data.text,
  };

  if (meta?.room) {
    server.broadcastTo(meta.room, "chat", msg);
  }
});

server.on("joinRoom", (data: { room: string }, socket: any) => {
  const { room } = data;

  server.joinRoom(socket, room);
  server.to(socket).store({ room });
  server.to(socket).signal("roomJoined", { room });
});

server.on("leaveRoom", (data: { room: string }, socket: any) => {
  const { room } = data;
  const meta = server.get(socket);

  server.leaveRoom(socket, room);
  server.to(socket).signal("roomLeft", { room });

  if (meta?.room === room) {
    server.to(socket).store({ room: null });
  }
});

server.on("logout", (_: any, socket: any) => {
  server.leaveAllRooms(socket);
  // server.to(socket).store({ room: null }).signal("loggedOut", {});
});
