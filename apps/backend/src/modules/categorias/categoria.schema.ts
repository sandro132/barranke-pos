import { z } from "zod";
import { AreaPreparacion } from "@barranke/shared";

export const crearCategoriaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  // Opcional: si no se manda, se genera automáticamente a partir del nombre.
  prefijoSku: z
    .string()
    .min(2, "El prefijo debe tener al menos 2 letras")
    .max(6, "El prefijo no puede tener más de 6 letras")
    .regex(/^[A-Za-z]+$/, "El prefijo solo puede tener letras")
    .optional(),
  areaPreparacion: z.nativeEnum(AreaPreparacion).default(AreaPreparacion.NINGUNA),
});

export const actualizarCategoriaSchema = crearCategoriaSchema.partial();

export type CrearCategoriaInput = z.infer<typeof crearCategoriaSchema>;
export type ActualizarCategoriaInput = z.infer<typeof actualizarCategoriaSchema>;
