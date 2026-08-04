/**
 * Tipos y enums compartidos entre backend y frontend.
 * Estos deben reflejar exactamente los enums definidos en prisma/schema.prisma.
 * El frontend NUNCA importa @prisma/client directamente: importa de aquí.
 */

export enum RolUsuario {
  ADMIN = "ADMIN",
  MESERO = "MESERO",
  COCINA = "COCINA",
  BAR = "BAR",
}

export enum TipoEspacio {
  MESA = "MESA",
  BARRA = "BARRA",
}

export enum EstadoEspacio {
  LIBRE = "LIBRE",
  OCUPADA = "OCUPADA",
  RESERVADA = "RESERVADA",
}

// Nota: las categorías de producto (antes un enum fijo aquí) ahora son una
// tabla real (`Categoria`) que se administra desde la app — ver el módulo
// de categorías del backend. No hay enum que mantener.

export enum UnidadMedida {
  UNIDAD = "UNIDAD",
  GRAMO = "GRAMO",
  KILOGRAMO = "KILOGRAMO",
  MILILITRO = "MILILITRO",
  LITRO = "LITRO",
  ONZA = "ONZA",
  BOTELLA = "BOTELLA",
}

export enum EstadoPedido {
  PENDIENTE = "PENDIENTE",
  PREPARANDO = "PREPARANDO",
  LISTO = "LISTO",
  ENTREGADO = "ENTREGADO",
  CANCELADO = "CANCELADO",
}

export enum AreaPreparacion {
  COCINA = "COCINA",
  BARRA = "BARRA",
  NINGUNA = "NINGUNA",
}

export enum MetodoPago {
  EFECTIVO = "EFECTIVO",
  TRANSFERENCIA_BANCOLOMBIA = "TRANSFERENCIA_BANCOLOMBIA",
  NEQUI = "NEQUI",
  DAVIPLATA = "DAVIPLATA",
  TARJETA = "TARJETA",
  OTRO = "OTRO",
  // Se le carga a la cuenta de un cliente de confianza; no entra plata a la
  // caja en el momento. Requiere elegir un cliente al cerrar la mesa.
  FIADO = "FIADO",
}

export enum TipoMovimientoCuentaCliente {
  CARGO = "CARGO",
  ABONO = "ABONO",
}

export enum TipoMovimientoInventario {
  ENTRADA = "ENTRADA",
  SALIDA = "SALIDA",
  AJUSTE = "AJUSTE",
  VENTA = "VENTA",
  COMPRA = "COMPRA",
}

export enum TipoMovimientoCaja {
  APERTURA = "APERTURA",
  CIERRE = "CIERRE",
  INGRESO = "INGRESO",
  GASTO = "GASTO",
  VENTA = "VENTA",
}

export enum TipoPromocion {
  HAPPY_HOUR = "HAPPY_HOUR",
  DOS_POR_UNO = "DOS_POR_UNO",
  COMBO = "COMBO",
  DESCUENTO = "DESCUENTO",
}

// ---- DTOs de autenticación (contrato entre frontend y backend) ----

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface UsuarioPublicoDTO {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

export interface LoginResponseDTO {
  token: string;
  usuario: UsuarioPublicoDTO;
}

// ---- Eventos de Socket.IO (mismos nombres en backend y frontend) ----

export const SOCKET_EVENTS = {
  PEDIDO_NUEVO: "pedido:nuevo",
  PEDIDO_ITEM_ACTUALIZADO: "pedido:item-actualizado",
  ESPACIO_ACTUALIZADO: "espacio:actualizado",
} as const;
