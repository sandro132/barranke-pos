import { apiRequest } from "./api";

export interface ProductoDTO {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  costo: number;
  stock: number;
  unidad: string;
  activo: boolean;
  codigoInterno: string;
}

export function listarProductos(params?: { categoria?: string; activo?: boolean }) {
  const query = new URLSearchParams();
  if (params?.categoria) query.set("categoria", params.categoria);
  if (params?.activo !== undefined) query.set("activo", String(params.activo));
  const qs = query.toString();
  return apiRequest<ProductoDTO[]>(`/productos${qs ? `?${qs}` : ""}`);
}
