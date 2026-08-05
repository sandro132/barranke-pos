-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "precio" DECIMAL NOT NULL,
    "costo" DECIMAL NOT NULL,
    "stock" DECIMAL NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL NOT NULL DEFAULT 0,
    "unidad" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "codigoInterno" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Producto" ("activo", "categoriaId", "codigoInterno", "costo", "createdAt", "id", "imagenUrl", "nombre", "precio", "stock", "unidad", "updatedAt") SELECT "activo", "categoriaId", "codigoInterno", "costo", "createdAt", "id", "imagenUrl", "nombre", "precio", "stock", "unidad", "updatedAt" FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
CREATE UNIQUE INDEX "Producto_codigoInterno_key" ON "Producto"("codigoInterno");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
