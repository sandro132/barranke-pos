/*
  Warnings:

  - You are about to drop the column `descripcion` on the `Espacio` table. All the data in the column will be lost.
  - You are about to drop the column `espacioPadreId` on the `Espacio` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `Espacio` table. All the data in the column will be lost.
  - You are about to drop the column `horaApertura` on the `Espacio` table. All the data in the column will be lost.
  - You are about to drop the column `espacioId` on the `Pedido` table. All the data in the column will be lost.
  - You are about to drop the column `espacioId` on the `Venta` table. All the data in the column will be lost.
  - Made the column `cuentaId` on table `Pedido` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cuentaId` on table `Venta` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Espacio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "capacidad" INTEGER
);
INSERT INTO "new_Espacio" ("capacidad", "id", "nombre", "tipo") SELECT "capacidad", "id", "nombre", "tipo" FROM "Espacio";
DROP TABLE "Espacio";
ALTER TABLE "new_Espacio" RENAME TO "Espacio";
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ventaId" TEXT,
    CONSTRAINT "Pedido_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("createdAt", "cuentaId", "estado", "id", "usuarioId", "ventaId") SELECT "createdAt", "cuentaId", "estado", "id", "usuarioId", "ventaId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE TABLE "new_Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "descuento" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cajaId" TEXT,
    "clienteId" TEXT,
    CONSTRAINT "Venta_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Venta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Venta_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("cajaId", "clienteId", "cuentaId", "descuento", "fecha", "id", "metodoPago", "subtotal", "total", "usuarioId") SELECT "cajaId", "clienteId", "cuentaId", "descuento", "fecha", "id", "metodoPago", "subtotal", "total", "usuarioId" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
