import { apiRequest } from "./api";
import { ProductoDTO } from "./productoService";
import { EspacioDTO } from "./espacioService";

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
  pedido?: { id: string; createdAt: string; cuenta: { id: string; nombre: string; espacio: EspacioDTO | null } };
}

export interface PedidoDTO {
  id: string;
  cuentaId: string;
  usuarioId: string;
  estado: "PENDIENTE" | "PREPARANDO" | "LISTO" | "ENTREGADO" | "CANCELADO";
  createdAt: string;
  usuario: { id: string; nombre: string };
  items: ItemPedidoDTO[];
}

export function listarPorCuenta(cuentaId: string) {
  return apiRequest<PedidoDTO[]>(`/pedidos/cuenta/${cuentaId}`);
}

export function repetirUltimaRonda(cuentaId: string) {
  return apiRequest<PedidoDTO>(`/pedidos/cuenta/${cuentaId}/repetir-ultima-ronda`, {
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

export function cancelarItem(itemId: string) {
  return apiRequest<ItemPedidoDTO>(`/pedidos/items/${itemId}/cancelar`, { method: "POST" });
}

export function crearPedido(cuentaId: string, items: { productoId: string; cantidad: number; notas?: string }[]) {
  return apiRequest<PedidoDTO>(`/pedidos`, {
    method: "POST",
    body: { cuentaId, items },
  });
}
