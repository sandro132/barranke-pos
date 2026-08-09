import { apiRequest } from "./api";

export interface TicketDTO {
  id: string;
  fecha: string;
  cuenta: string;
  espacio: string | null;
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
  cuenta: { id: string; nombre: string; espacio: { nombre: string } | null };
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

export function cambiarMetodoPago(ventaId: string, metodoPago: string, clienteId?: string) {
  return apiRequest<TicketDTO>(`/ventas/${ventaId}/metodo-pago`, {
    method: "PATCH",
    body: { metodoPago, clienteId },
  });
}
