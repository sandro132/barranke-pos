import { apiRequest } from "./api";

export interface IngredienteDTO {
  id: string;
  nombre: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  costoUnitario: number;
  stockBajo: boolean;
}

export interface CrearIngredienteInput {
  nombre: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  costoUnitario: number;
}

export interface MovimientoIngredienteDTO {
  id: string;
  tipo: string;
  cantidad: number;
  motivo: string | null;
  fecha: string;
}

export function listarIngredientes(soloStockBajo?: boolean) {
  const query = soloStockBajo ? "?stockBajo=true" : "";
  return apiRequest<IngredienteDTO[]>(`/ingredientes${query}`);
}

export function crearIngrediente(data: CrearIngredienteInput) {
  return apiRequest<IngredienteDTO>("/ingredientes", { method: "POST", body: data });
}

export function actualizarIngrediente(id: string, data: Partial<CrearIngredienteInput>) {
  return apiRequest<IngredienteDTO>(`/ingredientes/${id}`, { method: "PATCH", body: data });
}

export function ajustarStockIngrediente(id: string, cantidad: number, motivo: string) {
  return apiRequest<IngredienteDTO>(`/ingredientes/${id}/ajustar-stock`, {
    method: "POST",
    body: { cantidad, motivo },
  });
}

export function eliminarIngrediente(id: string) {
  return apiRequest(`/ingredientes/${id}`, { method: "DELETE" });
}

export function obtenerMovimientosIngrediente(id: string) {
  return apiRequest<MovimientoIngredienteDTO[]>(`/ingredientes/${id}/movimientos`);
}
