import { z } from "zod";
import { TipoEspacio } from "@barranke/shared";

export const crearEspacioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.nativeEnum(TipoEspacio),
  capacidad: z.number().int().positive().optional(),
});

export const actualizarEspacioSchema = z.object({
  nombre: z.string().min(1).optional(),
  capacidad: z.number().int().positive().optional().nullable(),
});

export const abrirEspacioSchema = z.object({
  descripcion: z.string().max(200, "Máximo 200 caracteres").optional(),
});

export const listarEspaciosQuerySchema = z.object({
  tipo: z.nativeEnum(TipoEspacio).optional(),
});

export type CrearEspacioInput = z.infer<typeof crearEspacioSchema>;
export type ActualizarEspacioInput = z.infer<typeof actualizarEspacioSchema>;
export type AbrirEspacioInput = z.infer<typeof abrirEspacioSchema>;
