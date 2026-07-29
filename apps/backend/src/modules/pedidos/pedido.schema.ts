import { z } from "zod";
import { EstadoPedido } from "@barranke/shared";

const itemPedidoInputSchema = z.object({
  productoId: z.string().min(1, "El producto es requerido"),
  cantidad: z.number().int().positive("La cantidad debe ser un entero mayor a 0"),
  notas: z.string().optional(),
});

export const crearPedidoSchema = z.object({
  espacioId: z.string().min(1, "El espacio (mesa/barra) es requerido"),
  items: z.array(itemPedidoInputSchema).min(1, "El pedido debe tener al menos un producto"),
});

// Estados a los que un ítem puede transicionar manualmente desde cocina/barra.
// PENDIENTE no se incluye porque es el estado inicial automático, no un destino manual.
const ESTADOS_ITEM_VALIDOS = [
  EstadoPedido.PREPARANDO,
  EstadoPedido.LISTO,
  EstadoPedido.ENTREGADO,
  EstadoPedido.CANCELADO,
] as const;

export const actualizarEstadoItemSchema = z.object({
  estado: z.enum(
    ESTADOS_ITEM_VALIDOS as unknown as [string, ...string[]]
  ),
});

export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
export type ActualizarEstadoItemInput = z.infer<typeof actualizarEstadoItemSchema>;
