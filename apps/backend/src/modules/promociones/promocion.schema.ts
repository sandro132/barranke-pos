import { z } from "zod";
import { TipoPromocion } from "@barranke/shared";

export const crearPromocionSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.nativeEnum(TipoPromocion),
  activa: z.boolean().default(false),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),
  diasSemana: z.string().optional(),
  valor: z.number().nonnegative().optional(),
});

export const actualizarPromocionSchema = crearPromocionSchema.partial();

export type CrearPromocionInput = z.infer<typeof crearPromocionSchema>;
export type ActualizarPromocionInput = z.infer<typeof actualizarPromocionSchema>;
