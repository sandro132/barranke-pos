import { z } from "zod";
import { TipoEspacio } from "@barranke/shared";

// Espacio ahora es solo información física (mesa/barra, nombre, capacidad).
// Todo lo operativo (abrir, cerrar, unir, fiado, etc.) vive en el módulo de
// Cuentas — un espacio ya no se "ocupa", puede tener varias cuentas abiertas
// al mismo tiempo o ninguna.

export const crearEspacioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.nativeEnum(TipoEspacio),
  capacidad: z.number().int().positive().optional(),
});

export const actualizarEspacioSchema = z.object({
  nombre: z.string().min(1).optional(),
  capacidad: z.number().int().positive().optional().nullable(),
});

export const listarEspaciosQuerySchema = z.object({
  tipo: z.nativeEnum(TipoEspacio).optional(),
});

export type CrearEspacioInput = z.infer<typeof crearEspacioSchema>;
export type ActualizarEspacioInput = z.infer<typeof actualizarEspacioSchema>;
