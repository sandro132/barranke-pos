import { z } from "zod";

export const agregarItemRecetaSchema = z.object({
  ingredienteId: z.string().min(1, "El ingrediente es requerido"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
});

export const actualizarItemRecetaSchema = z.object({
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
});

export type AgregarItemRecetaInput = z.infer<typeof agregarItemRecetaSchema>;
export type ActualizarItemRecetaInput = z.infer<typeof actualizarItemRecetaSchema>;
