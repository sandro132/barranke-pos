import { z } from "zod";
import { UnidadMedida } from "@barranke/shared";

export const crearIngredienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  unidad: z.nativeEnum(UnidadMedida),
  stock: z.number().nonnegative().default(0),
  stockMinimo: z.number().nonnegative().default(0),
  costoUnitario: z.number().nonnegative().default(0),
});

export const actualizarIngredienteSchema = crearIngredienteSchema.partial();

export const ajustarStockSchema = z.object({
  // cantidad puede ser positiva (entrada/ajuste hacia arriba) o negativa (salida/merma)
  cantidad: z.number().refine((v) => v !== 0, "La cantidad no puede ser 0"),
  motivo: z.string().min(1, "El motivo es requerido, ej. 'merma', 'compra', 'corrección de conteo'"),
});

export type CrearIngredienteInput = z.infer<typeof crearIngredienteSchema>;
export type ActualizarIngredienteInput = z.infer<typeof actualizarIngredienteSchema>;
export type AjustarStockInput = z.infer<typeof ajustarStockSchema>;
