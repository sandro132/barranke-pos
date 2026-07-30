import { apiRequest } from "./api";
import { ProductoDTO } from "./productoService";

export interface ItemPedidoDTO {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  areaPreparacion: "COCINA" | "BARRA" | "NINGUNA";
  estado: "PENDIENTE" | "PREPARANDO" | "LISTO" | "ENTREGADO" | "CANCELADO";
  notas: string | null;
  producto: ProductoDTO;
  pedido?: { id: string; espacio: { id: string; nombre: string } };
}

export interface PedidoDTO {
  id: string;
  espacioId: string;
  usuarioId: string;
  estado: "PENDIENTE" | "PREPARANDO" | "LISTO" | "ENTREGADO" | "CANCELADO";
  createdAt: string;
  usuario: { id: string; nombre: string };
  items: ItemPedidoDTO[];
}

export function listarPorEspacio(espacioId: string) {
  return apiRequest<PedidoDTO[]>(`/pedidos/espacio/${espacioId}`);
}

export function repetirUltimaRonda(espacioId: string) {
  return apiRequest<PedidoDTO>(`/pedidos/espacio/${espacioId}/repetir-ultima-ronda`, {
    method: "POST",
  });
}

export function listarParaCocina() {
  return apiRequest<ItemPedidoDTO[]>("/pedidos/cocina");
}

export function listarParaBarra() {
  return apiRequest<ItemPedidoDTO[]>("/pedidos/barra");
}

export function actualizarEstadoItem(itemId: string, estado: string) {
  return apiRequest<ItemPedidoDTO>(`/pedidos/items/${itemId}/estado`, {
    method: "PATCH",
    body: { estado },
  });
}

export function crearPedido(espacioId: string, items: { productoId: string; cantidad: number; notas?: string }[]) {
  return apiRequest(`/pedidos`, {
    method: "POST",
    body: { espacioId, items },
  });
}
