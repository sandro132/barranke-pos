import { z } from "zod";
import { MetodoPago, TipoMovimientoCaja } from "@barranke/shared";

export const abrirCajaSchema = z.object({
  montoInicial: z.number().nonnegative("El monto inicial no puede ser negativo"),
});

// Solo INGRESO y GASTO se registran manualmente. APERTURA, CIERRE y VENTA
// los genera el sistema automáticamente en sus respectivos flujos.
const TIPOS_MOVIMIENTO_MANUAL = [TipoMovimientoCaja.INGRESO, TipoMovimientoCaja.GASTO] as const;

// FIADO no aplica aquí — un ingreso/gasto de caja es un movimiento de plata
// real en el momento, no una deuda pendiente.
const METODOS_MOVIMIENTO_CAJA = Object.values(MetodoPago).filter((m) => m !== MetodoPago.FIADO) as [
  string,
  ...string[],
];

export const registrarMovimientoSchema = z.object({
  tipo: z.enum(TIPOS_MOVIMIENTO_MANUAL as unknown as [string, ...string[]]),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  metodoPago: z.enum(METODOS_MOVIMIENTO_CAJA),
  descripcion: z.string().min(1, "La descripción es requerida"),
});

export const actualizarMovimientoSchema = z.object({
  monto: z.number().positive("El monto debe ser mayor a 0").optional(),
  metodoPago: z.enum(METODOS_MOVIMIENTO_CAJA).optional(),
  descripcion: z.string().min(1).optional(),
});

export const cerrarCajaSchema = z.object({
  montoContado: z.number().nonnegative("El monto contado no puede ser negativo"),
});

export type AbrirCajaInput = z.infer<typeof abrirCajaSchema>;
export type RegistrarMovimientoInput = z.infer<typeof registrarMovimientoSchema>;
export type ActualizarMovimientoInput = z.infer<typeof actualizarMovimientoSchema>;
export type CerrarCajaInput = z.infer<typeof cerrarCajaSchema>;
