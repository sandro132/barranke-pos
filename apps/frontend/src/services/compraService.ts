import { apiRequest } from "./api";
import { ProductoDTO } from "./productoService";
import { IngredienteDTO } from "./ingredienteService";

export interface ItemCompraDTO {
  id: string;
  cantidad: number;
  costoUnitario: number;
  producto: ProductoDTO | null;
  ingrediente: IngredienteDTO | null;
}

export interface CompraDTO {
  id: string;
  proveedorId: string;
  proveedor: { id: string; nombre: string };
  factura: string | null;
  fecha: string;
  total: number;
  items: ItemCompraDTO[];
}

export interface ItemCompraInput {
  productoId?: string;
  ingredienteId?: string;
  cantidad: number;
  costoUnitario: number;
}

export function listarCompras() {
  return apiRequest<CompraDTO[]>("/compras");
}

export function crearCompra(proveedorId: string, factura: string | undefined, items: ItemCompraInput[]) {
  return apiRequest<CompraDTO>("/compras", {
    method: "POST",
    body: { proveedorId, factura, items },
  });
}

export function actualizarCompra(id: string, proveedorId: string, factura?: string) {
  return apiRequest<CompraDTO>(`/compras/${id}`, {
    method: "PATCH",
    body: { proveedorId, factura },
  });
}

export function anularCompra(id: string) {
  return apiRequest<void>(`/compras/${id}`, { method: "DELETE" });
}
