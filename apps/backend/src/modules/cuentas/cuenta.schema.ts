import { z } from "zod";
import { MetodoPago } from "@barranke/shared";

export const abrirCuentaSchema = z.object({
  nombre: z.string().min(1, "El nombre de la cuenta es requerido").max(200),
  espacioId: z.string().optional(),
  descripcion: z.string().max(200, "Máximo 200 caracteres").optional(),
});

export const actualizarCuentaSchema = z.object({
  nombre: z.string().min(1).optional(),
  espacioId: z.string().optional().nullable(),
  descripcion: z.string().max(200).optional().nullable(),
});

// metodoPago es opcional aquí porque si la cuenta no tuvo consumo (se abrió
// por error), se puede cerrar sin pagar nada. El service exige el dato solo
// si hay un total mayor a 0.
// pagos es la alternativa para "dividir cuenta": en vez de un solo método,
// una lista de pagos (cada uno con su monto y método) que deben sumar el total.
// clienteId es obligatorio (a nivel de service) cuando el método es FIADO.
export const cerrarCuentaSchema = z.object({
  metodoPago: z.nativeEnum(MetodoPago).optional(),
  clienteId: z.string().optional(),
  // Monto fijo en pesos a descontar del total antes de cobrar (ej. cortesía,
  // cliente frecuente). El mesero calcula el % a mano y pone el monto final
  // — mantiene la lógica del backend simple y a prueba de errores de redondeo.
  descuento: z.number().nonnegative().optional(),
  pagos: z
    .array(
      z.object({
        metodoPago: z.nativeEnum(MetodoPago),
        monto: z.number().positive("Cada pago debe ser mayor a 0"),
        clienteId: z.string().optional(),
      })
    )
    .min(2, "Para dividir la cuenta se necesitan al menos 2 pagos")
    .optional(),
});

export const unirCuentasSchema = z.object({
  hijoIds: z.array(z.string()).min(1, "Selecciona al menos una cuenta para unir"),
});

export type AbrirCuentaInput = z.infer<typeof abrirCuentaSchema>;
export type ActualizarCuentaInput = z.infer<typeof actualizarCuentaSchema>;
export type CerrarCuentaInput = z.infer<typeof cerrarCuentaSchema>;
export type UnirCuentasInput = z.infer<typeof unirCuentasSchema>;
