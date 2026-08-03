import { useAuthStore } from "../stores/authStore";

// Por defecto usa una ruta RELATIVA ("/api"), no una URL fija. Como el backend
// sirve la app y la API desde el mismo servidor y puerto, esto funciona
// automáticamente sin importar cómo se accede (localhost, la IP de la red
// local, o un dominio público por túnel) — nunca hay que tocar esto.
// Solo se necesita un VITE_API_URL explícito si corres el frontend por
// separado en modo desarrollo (npm run dev en el puerto 5173).
const API_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  status: number;
  detalles?: unknown;

  constructor(message: string, status: number, detalles?: unknown) {
    super(message);
    this.status = status;
    this.detalles = detalles;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * Wrapper único sobre fetch: agrega el header Authorization automáticamente,
 * y convierte errores del backend (formato { error, detalles }) en ApiError,
 * para que los componentes puedan hacer try/catch de forma consistente.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token } = useAuthStore.getState();

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Si el token expiró o es inválido, cierra la sesión para forzar login de nuevo.
    if (response.status === 401) {
      useAuthStore.getState().cerrarSesion();
    }
    throw new ApiError(data?.error ?? "Error de conexión con el servidor", response.status, data?.detalles);
  }

  return data as T;
}
