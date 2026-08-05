import { z } from "zod";

export const crearProductoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  categoriaId: z.string().min(1, "La categoría es requerida"),
  precio: z.number().positive("El precio debe ser mayor a 0"),
  costo: z.number().nonnegative("El costo no puede ser negativo"),
  // stock inicial: solo relevante para productos SIN receta (ej. cervezas). Opcional.
  stock: z.number().nonnegative().default(0),
  stockMinimo: z.number().nonnegative().default(0),
  unidad: z.string().min(1, "La unidad es requerida"),
  imagenUrl: z.string().url().optional().nullable(),
});

export const actualizarProductoSchema = crearProductoSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const listarProductosQuerySchema = z.object({
  categoriaId: z.string().optional(),
  activo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  busqueda: z.string().optional(),
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
