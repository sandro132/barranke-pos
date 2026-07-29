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

export enum CategoriaProducto {
  CERVEZA = "CERVEZA",
  LICOR = "LICOR",
  COMIDA = "COMIDA",
  COCTEL = "COCTEL",
  OTRO = "OTRO",
}

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

// Prefijos usados para generar el código interno (SKU) automático por categoría
export const PREFIJO_SKU_POR_CATEGORIA: Record<CategoriaProducto, string> = {
  [CategoriaProducto.CERVEZA]: "CERV",
  [CategoriaProducto.LICOR]: "LICO",
  [CategoriaProducto.COMIDA]: "COMI",
  [CategoriaProducto.COCTEL]: "COCT",
  [CategoriaProducto.OTRO]: "OTRO",
};

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
