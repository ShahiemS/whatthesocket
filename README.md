# WhatTheSocket

**WhatTheSocket** is a WebSocket-based real-time communication library designed for flexibility, reliability, and structured JSON-based events. Built on top of `ws`, it supports rooms, rate limiting, reconnections, and more. Making it ideal for building chat apps, multiplayer games, or real-time dashboards.

## 🚀 Features

### 🔌 WebSocket Server

- Lightweight, fast setup with `ws`
- Custom hooks

### 👥 Room Management

- Join, leave, and broadcast to named rooms
- Server-side room lifecycle hooks:

  - `onRoomStart`, `onRoomJoin`, `onRoomLeave`, `onRoomDestroy`

### 🚦 Rate Limiting

- Prevents abuse by limiting messages per second
- Throttling queue

### 🏷️ Tag System

- Attach tags to sockets (e.g., roles, flags)

### 🧪 Debugging

- Optional debug logs per socket
- Enable via `debug: true` in options

---

## 📦 Installation

```bash
npm install whatthesocket
```
