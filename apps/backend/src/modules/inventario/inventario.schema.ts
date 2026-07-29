import { z } from "zod";

// Este endpoint existe para poder PROBAR la lógica de descuento automático
// antes de que exista el módulo de Pedidos (Fase 3), que será quien la use
// de verdad en el flujo real de ventas.
export const simularVentaSchema = z.object({
  productoId: z.string().min(1, "El producto es requerido"),
  cantidad: z.number().int().positive("La cantidad debe ser un entero mayor a 0"),
});

export type SimularVentaInput = z.infer<typeof simularVentaSchema>;
