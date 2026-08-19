import { z } from "zod";
import { TipoGasto } from "@barranke/shared";

export const crearGastoSchema = z.object({
  concepto: z.string().min(1, "El concepto es requerido"),
  categoria: z.nativeEnum(TipoGasto),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().optional(),
  notas: z.string().optional(),
});

export const actualizarGastoSchema = z.object({
  concepto: z.string().min(1).optional(),
  categoria: z.nativeEnum(TipoGasto).optional(),
  monto: z.number().positive().optional(),
  fecha: z.string().optional(),
  notas: z.string().optional(),
});

export const listarGastosQuerySchema = z.object({
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export type CrearGastoInput = z.infer<typeof crearGastoSchema>;
export type ActualizarGastoInput = z.infer<typeof actualizarGastoSchema>;
