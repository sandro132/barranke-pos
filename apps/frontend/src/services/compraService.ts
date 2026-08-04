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
  proveedor: string;
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

export function crearCompra(proveedor: string, factura: string | undefined, items: ItemCompraInput[]) {
  return apiRequest<CompraDTO>("/compras", {
    method: "POST",
    body: { proveedor, factura, items },
  });
}

export function actualizarCompra(id: string, proveedor: string, factura?: string) {
  return apiRequest<CompraDTO>(`/compras/${id}`, {
    method: "PATCH",
    body: { proveedor, factura },
  });
}

export function anularCompra(id: string) {
  return apiRequest<void>(`/compras/${id}`, { method: "DELETE" });
}
