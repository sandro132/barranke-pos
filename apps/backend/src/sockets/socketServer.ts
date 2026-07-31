import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env";

let ioInstance: SocketIOServer | null = null;

/**
 * Inicializa Socket.IO. Se llama una sola vez desde server.ts al arrancar.
 * Cualquier otro módulo (ej. pedido.service) usa getIO() para emitir eventos,
 * en vez de importar server.ts directamente (eso crearía una dependencia circular).
 */
export function initSocket(httpServer: http.Server): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  ioInstance.on("connection", (socket) => {
    console.log(`[socket] cliente conectado: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[socket] cliente desconectado: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error("Socket.IO no ha sido inicializado. Revisa que server.ts llame a initSocket().");
  }
  return ioInstance;
}
