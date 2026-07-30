import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Devuelve la instancia única de socket, creándola la primera vez que se pide.
 * Se llama desde un componente raíz (ver App.tsx) una vez que hay sesión activa.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}
