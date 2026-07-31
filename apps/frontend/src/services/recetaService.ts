import { apiRequest } from "./api";
import { IngredienteDTO } from "./ingredienteService";

export interface RecetaItemDTO {
  id: string;
  productoId: string;
  ingredienteId: string;
  cantidad: number;
  ingrediente: IngredienteDTO;
}

export function obtenerReceta(productoId: string) {
  return apiRequest<RecetaItemDTO[]>(`/productos/${productoId}/receta`);
}

export function agregarItemReceta(productoId: string, ingredienteId: string, cantidad: number) {
  return apiRequest<RecetaItemDTO>(`/productos/${productoId}/receta`, {
    method: "POST",
    body: { ingredienteId, cantidad },
  });
}

export function actualizarItemReceta(productoId: string, ingredienteId: string, cantidad: number) {
  return apiRequest<RecetaItemDTO>(`/productos/${productoId}/receta/${ingredienteId}`, {
    method: "PATCH",
    body: { cantidad },
  });
}

export function eliminarItemReceta(productoId: string, ingredienteId: string) {
  return apiRequest(`/productos/${productoId}/receta/${ingredienteId}`, { method: "DELETE" });
}
