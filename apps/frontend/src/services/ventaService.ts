import { apiRequest } from "./api";

export interface TicketDTO {
  id: string;
  fecha: string;
  espacio: string;
  usuario: string;
  metodoPago: string;
  subtotal: number;
  descuento: number;
  total: number;
  items: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
}

export interface VentaDTO {
  id: string;
  total: number;
  metodoPago: string;
  fecha: string;
  espacio: { id: string; nombre: string };
  cliente: { id: string; nombre: string } | null;
  caja: { id: string; abierta: boolean } | null;
}

export function obtenerTicket(ventaId: string) {
  return apiRequest<TicketDTO>(`/ventas/${ventaId}/ticket`);
}

export function listarVentas(desde?: string, hasta?: string) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const qs = params.toString();
  return apiRequest<VentaDTO[]>(`/ventas${qs ? `?${qs}` : ""}`);
}

export function anularVenta(ventaId: string) {
  return apiRequest<void>(`/ventas/${ventaId}`, { method: "DELETE" });
}
