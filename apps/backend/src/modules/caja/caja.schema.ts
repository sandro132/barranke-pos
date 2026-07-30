import { z } from "zod";
import { TipoMovimientoCaja } from "@barranke/shared";

export const abrirCajaSchema = z.object({
  montoInicial: z.number().nonnegative("El monto inicial no puede ser negativo"),
});

// Solo INGRESO y GASTO se registran manualmente. APERTURA, CIERRE y VENTA
// los genera el sistema automáticamente en sus respectivos flujos.
const TIPOS_MOVIMIENTO_MANUAL = [TipoMovimientoCaja.INGRESO, TipoMovimientoCaja.GASTO] as const;

export const registrarMovimientoSchema = z.object({
  tipo: z.enum(TIPOS_MOVIMIENTO_MANUAL as unknown as [string, ...string[]]),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  descripcion: z.string().min(1, "La descripción es requerida"),
});

export const cerrarCajaSchema = z.object({
  montoContado: z.number().nonnegative("El monto contado no puede ser negativo"),
});

export type AbrirCajaInput = z.infer<typeof abrirCajaSchema>;
export type RegistrarMovimientoInput = z.infer<typeof registrarMovimientoSchema>;
export type CerrarCajaInput = z.infer<typeof cerrarCajaSchema>;
