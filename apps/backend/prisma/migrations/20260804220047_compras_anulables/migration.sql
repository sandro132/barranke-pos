-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MovimientoInventario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "cantidad" DECIMAL NOT NULL,
    "motivo" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" TEXT,
    "ingredienteId" TEXT,
    "compraId" TEXT,
    CONSTRAINT "MovimientoInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MovimientoInventario" ("cantidad", "fecha", "id", "ingredienteId", "motivo", "productoId", "tipo") SELECT "cantidad", "fecha", "id", "ingredienteId", "motivo", "productoId", "tipo" FROM "MovimientoInventario";
DROP TABLE "MovimientoInventario";
ALTER TABLE "new_MovimientoInventario" RENAME TO "MovimientoInventario";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
