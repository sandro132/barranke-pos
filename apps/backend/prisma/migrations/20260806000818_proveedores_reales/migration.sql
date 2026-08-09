-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "contacto" TEXT,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- Crea un proveedor real por cada nombre distinto que ya hayas escrito en tus compras
INSERT INTO "Proveedor" ("id", "nombre", "createdAt")
SELECT lower(hex(randomblob(16))), proveedor, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT proveedor FROM "Compra");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Compra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT NOT NULL,
    "factura" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL NOT NULL,
    CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Compra" ("id","proveedorId","factura","fecha","total")
SELECT c."id", p."id", c."factura", c."fecha", c."total"
FROM "Compra" c
JOIN "Proveedor" p ON p."nombre" = c."proveedor";
DROP TABLE "Compra";
ALTER TABLE "new_Compra" RENAME TO "Compra";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;