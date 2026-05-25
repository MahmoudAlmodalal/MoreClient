import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyJwt } from "./auth";
import { logger } from "./logger";

// One hub per server lifetime. Dashboard sockets keyed by tenant_id; chat
// sockets keyed by session id so agent replies stream straight to the widget.
const dashboardClients = new Map<number, Set<WebSocket>>();
const chatClients = new Map<string, Set<WebSocket>>();

function addClient(map: Map<string | number, Set<WebSocket>>, key: string | number, ws: WebSocket) {
  let set = map.get(key as never);
  if (!set) {
    set = new Set();
    map.set(key as never, set);
  }
  set.add(ws);
}

function removeClient(
  map: Map<string | number, Set<WebSocket>>,
  key: string | number,
  ws: WebSocket,
) {
  const set = map.get(key as never);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) map.delete(key as never);
}

function setupHeartbeat(ws: WebSocket) {
  let alive = true;
  const heartbeat = setInterval(() => {
    if (!alive) {
      ws.terminate();
      clearInterval(heartbeat);
      return;
    }
    alive = false;
    try { ws.ping(); } catch { /* ignore */ }
  }, 30000);
  ws.on("pong", () => { alive = true; });
  ws.on("close", () => clearInterval(heartbeat));
}

export function attachWebSockets(server: Server): void {
  const wssDashboard = new WebSocketServer({ noServer: true });
  const wssChat = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;
    if (pathname === "/ws/dashboard") {
      const token = url.searchParams.get("token") || "";
      const auth = verifyJwt(token);
      if (!auth) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      wssDashboard.handleUpgrade(req, socket, head, (ws) => {
        addClient(dashboardClients as never, auth.tid, ws);
        setupHeartbeat(ws);
        ws.on("close", () => removeClient(dashboardClients as never, auth.tid, ws));
      });
      return;
    }
    if (pathname.startsWith("/ws/chat/")) {
      const sessionId = decodeURIComponent(pathname.slice("/ws/chat/".length));
      if (!sessionId) {
        socket.destroy();
        return;
      }
      wssChat.handleUpgrade(req, socket, head, (ws) => {
        addClient(chatClients as never, sessionId, ws);
        setupHeartbeat(ws);
        ws.on("close", () => removeClient(chatClients as never, sessionId, ws));
      });
      return;
    }
    socket.destroy();
  });

  logger.info("WebSocket endpoints attached: /ws/dashboard, /ws/chat/:sessionId");
}

export function broadcastDashboard(tenantId: number, payload: unknown): void {
  const set = dashboardClients.get(tenantId);
  if (!set || set.size === 0) return;
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(data); } catch { /* ignore */ }
    }
  }
}

export function broadcastChat(sessionId: string, payload: unknown): boolean {
  const set = chatClients.get(sessionId);
  if (!set || set.size === 0) return false;
  const data = JSON.stringify(payload);
  let delivered = false;
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(data); delivered = true; } catch { /* ignore */ }
    }
  }
  return delivered;
}
