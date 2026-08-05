import { apiRequest } from "./api";

export interface MovimientoConsumoInternoDTO {
  id: string;
  cantidad: number;
  motivo: string | null;
  fecha: string;
  producto: { nombre: string; costo: number } | null;
  ingrediente: { nombre: string; costoUnitario: number } | null;
  usuario: { id: string; nombre: string } | null;
}

export function registrarConsumoInterno(
  productoId: string | undefined,
  ingredienteId: string | undefined,
  cantidad: number,
  motivo?: string
) {
  return apiRequest<MovimientoConsumoInternoDTO>("/consumo-interno", {
    method: "POST",
    body: { productoId, ingredienteId, cantidad, motivo },
  });
}

export function listarConsumoInterno(desde?: string, hasta?: string) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const qs = params.toString();
  return apiRequest<MovimientoConsumoInternoDTO[]>(`/consumo-interno${qs ? `?${qs}` : ""}`);
}
