import { z } from "zod";

export const crearClienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  telefono: z.string().optional(),
  // Fecha en formato YYYY-MM-DD
  cumpleanos: z.string().optional(),
});

export const actualizarClienteSchema = crearClienteSchema.partial();

import { MetodoPago } from "@barranke/shared";

const METODOS_ABONO = Object.values(MetodoPago).filter((m) => m !== MetodoPago.FIADO) as [
  string,
  ...string[],
];

export const registrarAbonoSchema = z.object({
  monto: z.number().positive("El monto debe ser mayor a 0"),
  metodoPago: z.enum(METODOS_ABONO),
  descripcion: z.string().optional(),
});

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
export type RegistrarAbonoInput = z.infer<typeof registrarAbonoSchema>;
