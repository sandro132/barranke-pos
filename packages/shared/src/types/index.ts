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

// Antes existía EstadoEspacio (LIBRE/OCUPADA/RESERVADA): ahora el estado
// "abierto/cerrado" vive en Cuenta, no en Espacio (una mesa ya no se
// "ocupa", puede tener varias cuentas abiertas al mismo tiempo o ninguna).
export enum EstadoCuenta {
  ABIERTA = "ABIERTA",
  CERRADA = "CERRADA",
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
  // Cuando alguien del personal toma un producto/ingrediente sin pagarlo
  // (cortesía, consumo propio). Se descuenta del inventario, pero queda
  // separado de las ventas reales para no ensuciar los reportes de ingresos.
  CONSUMO_INTERNO = "CONSUMO_INTERNO",
}

export enum TipoMovimientoCaja {
  APERTURA = "APERTURA",
  CIERRE = "CIERRE",
  INGRESO = "INGRESO",
  GASTO = "GASTO",
  VENTA = "VENTA",
  // Aparte de VENTA a propósito: la propina no es ingreso del negocio (no
  // cuenta como ganancia ni en los reportes de ventas), aunque si es en
  // efectivo sí afecta lo que debe haber físicamente en la caja.
  PROPINA = "PROPINA",
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

export enum TipoGasto {
  ARRIENDO = "ARRIENDO",
  SERVICIOS = "SERVICIOS",
  NOMINA = "NOMINA",
  OTRO = "OTRO",
}

export const SOCKET_EVENTS = {
  PEDIDO_NUEVO: "pedido:nuevo",
  PEDIDO_ITEM_ACTUALIZADO: "pedido:item-actualizado",
  ESPACIO_ACTUALIZADO: "espacio:actualizado",
  CUENTA_ACTUALIZADA: "cuenta:actualizada",
} as const;
