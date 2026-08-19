import { apiRequest } from "./api";

export interface GastoDTO {
  id: string;
  concepto: string;
  categoria: "ARRIENDO" | "SERVICIOS" | "NOMINA" | "OTRO";
  monto: number;
  fecha: string;
  notas: string | null;
  usuario: { id: string; nombre: string } | null;
}

export interface GastoInput {
  concepto: string;
  categoria: string;
  monto: number;
  fecha?: string;
  notas?: string;
}

export function listarGastos(desde?: string, hasta?: string) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const qs = params.toString();
  return apiRequest<GastoDTO[]>(`/gastos${qs ? `?${qs}` : ""}`);
}

export function crearGasto(data: GastoInput) {
  return apiRequest<GastoDTO>("/gastos", { method: "POST", body: data });
}

export function actualizarGasto(id: string, data: Partial<GastoInput>) {
  return apiRequest<GastoDTO>(`/gastos/${id}`, { method: "PATCH", body: data });
}

export function eliminarGasto(id: string) {
  return apiRequest(`/gastos/${id}`, { method: "DELETE" });
}
