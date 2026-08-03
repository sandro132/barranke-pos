import { io, Socket } from "socket.io-client";

// Igual que con la API: por defecto se conecta al MISMO origen desde donde se
// cargó la página (localhost, la IP local, o el dominio del túnel) — nunca
// hay que tocar esto salvo que corras el frontend por separado en desarrollo.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

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
