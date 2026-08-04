import { apiRequest } from "./api";

export interface CategoriaDTO {
  id: string;
  nombre: string;
  prefijoSku: string;
  areaPreparacion: "COCINA" | "BARRA" | "NINGUNA";
  _count: { productos: number };
}

export interface CategoriaInput {
  nombre: string;
  prefijoSku?: string;
  areaPreparacion: "COCINA" | "BARRA" | "NINGUNA";
}

export function listarCategorias() {
  return apiRequest<CategoriaDTO[]>("/categorias");
}

export function crearCategoria(data: CategoriaInput) {
  return apiRequest<CategoriaDTO>("/categorias", { method: "POST", body: data });
}

export function actualizarCategoria(id: string, data: Partial<CategoriaInput>) {
  return apiRequest<CategoriaDTO>(`/categorias/${id}`, { method: "PATCH", body: data });
}

export function eliminarCategoria(id: string) {
  return apiRequest(`/categorias/${id}`, { method: "DELETE" });
}
