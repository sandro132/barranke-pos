import { z } from "zod";
import { MetodoPago, TipoEspacio } from "@barranke/shared";

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

// metodoPago es opcional aquí porque si la mesa no tuvo consumo (se abrió por
// error), se puede cerrar sin pagar nada. El service exige el dato solo si hay
// un total mayor a 0.
// pagos es la alternativa para "dividir cuenta": en vez de un solo método,
// una lista de pagos (cada uno con su monto y método) que deben sumar el total.
export const cerrarEspacioSchema = z.object({
  metodoPago: z.nativeEnum(MetodoPago).optional(),
  pagos: z
    .array(
      z.object({
        metodoPago: z.nativeEnum(MetodoPago),
        monto: z.number().positive("Cada pago debe ser mayor a 0"),
      })
    )
    .min(2, "Para dividir la cuenta se necesitan al menos 2 pagos")
    .optional(),
});

export const unirEspaciosSchema = z.object({
  hijoIds: z.array(z.string()).min(1, "Selecciona al menos una mesa para unir"),
});

export type UnirEspaciosInput = z.infer<typeof unirEspaciosSchema>;

export const listarEspaciosQuerySchema = z.object({
  tipo: z.nativeEnum(TipoEspacio).optional(),
});

export type CrearEspacioInput = z.infer<typeof crearEspacioSchema>;
export type ActualizarEspacioInput = z.infer<typeof actualizarEspacioSchema>;
export type AbrirEspacioInput = z.infer<typeof abrirEspacioSchema>;
export type CerrarEspacioInput = z.infer<typeof cerrarEspacioSchema>;
