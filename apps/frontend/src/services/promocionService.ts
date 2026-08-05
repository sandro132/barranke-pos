import { apiRequest } from "./api";

export interface PromocionDTO {
  id: string;
  nombre: string;
  tipo: string;
  activa: boolean;
  horaInicio: string | null;
  horaFin: string | null;
  diasSemana: string | null;
  valor: number | null;
  productoId: string | null;
  producto: { id: string; nombre: string } | null;
  cantidadRequerida: number | null;
  precioCombo: number | null;
}

export interface PromocionInput {
  nombre: string;
  tipo: string;
  activa: boolean;
  horaInicio?: string;
  horaFin?: string;
  diasSemana?: string;
  valor?: number;
  productoId?: string;
  cantidadRequerida?: number;
  precioCombo?: number;
}

export function listarPromociones() {
  return apiRequest<PromocionDTO[]>("/promociones");
}

export function crearPromocion(data: PromocionInput) {
  return apiRequest<PromocionDTO>("/promociones", { method: "POST", body: data });
}

export function actualizarPromocion(id: string, data: Partial<PromocionInput>) {
  return apiRequest<PromocionDTO>(`/promociones/${id}`, { method: "PATCH", body: data });
}

export function eliminarPromocion(id: string) {
  return apiRequest(`/promociones/${id}`, { method: "DELETE" });
}
