import { z } from "zod";
import { TipoPromocion } from "@barranke/shared";

export const crearPromocionSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido"),
    tipo: z.nativeEnum(TipoPromocion),
    activa: z.boolean().default(false),
    horaInicio: z.string().optional(),
    horaFin: z.string().optional(),
    diasSemana: z.string().optional(),
    valor: z.number().nonnegative().optional(),
    productoId: z.string().optional(),
    cantidadRequerida: z.number().int().positive().optional(),
    precioCombo: z.number().positive().optional(),
  })
  .refine(
    (data) =>
      data.tipo !== TipoPromocion.COMBO ||
      (data.productoId && data.cantidadRequerida && data.precioCombo),
    {
      message: "Un combo necesita producto, cantidad requerida y precio del combo",
    }
  );

export const actualizarPromocionSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.nativeEnum(TipoPromocion).optional(),
  activa: z.boolean().optional(),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),
  diasSemana: z.string().optional(),
  valor: z.number().nonnegative().optional(),
  productoId: z.string().optional(),
  cantidadRequerida: z.number().int().positive().optional(),
  precioCombo: z.number().positive().optional(),
});

export type CrearPromocionInput = z.infer<typeof crearPromocionSchema>;
export type ActualizarPromocionInput = z.infer<typeof actualizarPromocionSchema>;
