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

export function obtenerTicket(ventaId: string) {
  return apiRequest<TicketDTO>(`/ventas/${ventaId}/ticket`);
}
