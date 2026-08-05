import { apiRequest } from "./api";

export interface ProductoDTO {
  id: string;
  nombre: string;
  categoriaId: string;
  categoria: { id: string; nombre: string; areaPreparacion: string };
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  unidad: string;
  activo: boolean;
  codigoInterno: string;
}

export interface CrearProductoInput {
  nombre: string;
  categoriaId: string;
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  unidad: string;
}

export function listarProductos(params?: { categoriaId?: string; activo?: boolean }) {
  const query = new URLSearchParams();
  if (params?.categoriaId) query.set("categoriaId", params.categoriaId);
  if (params?.activo !== undefined) query.set("activo", String(params.activo));
  const qs = query.toString();
  return apiRequest<ProductoDTO[]>(`/productos${qs ? `?${qs}` : ""}`);
}

export function crearProducto(data: CrearProductoInput) {
  return apiRequest<ProductoDTO>("/productos", { method: "POST", body: data });
}

export function actualizarProducto(id: string, data: Partial<CrearProductoInput>) {
  return apiRequest<ProductoDTO>(`/productos/${id}`, { method: "PATCH", body: data });
}

export function desactivarProducto(id: string) {
  return apiRequest<ProductoDTO>(`/productos/${id}/desactivar`, { method: "POST" });
}

export function reactivarProducto(id: string) {
  return apiRequest<ProductoDTO>(`/productos/${id}/reactivar`, { method: "POST" });
}
