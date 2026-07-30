import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Por defecto, Prisma serializa los campos Decimal (precios, costos, stock) como
 * TEXTO en el JSON que se manda al frontend, para no perder precisión (ej. "8000"
 * en vez de 8000). Eso obliga a convertir manualmente en cada pantalla, y es fácil
 * olvidarlo (pasó en la pantalla de Nuevo Pedido: los precios se mostraban sin
 * formato de moneda porque llegaban como texto).
 *
 * Como esta app maneja pesos colombianos (números enteros, sin decimales reales
 * en la práctica), es seguro convertir Decimal a Number en la serialización:
 * elimina esa clase entera de bugs de una vez, en un solo lugar.
 */
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function (
  this: Prisma.Decimal
) {
  return this.toNumber();
};

/**
 * Cliente Prisma como singleton.
 * Evita crear múltiples conexiones a la base de datos durante hot-reload en desarrollo.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
