-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MovimientoCaja" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cajaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "monto" DECIMAL NOT NULL,
    "descripcion" TEXT,
    "usuarioId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ventaId" TEXT,
    CONSTRAINT "MovimientoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimientoCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimientoCaja_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MovimientoCaja" ("cajaId", "descripcion", "fecha", "id", "monto", "tipo", "usuarioId") SELECT "cajaId", "descripcion", "fecha", "id", "monto", "tipo", "usuarioId" FROM "MovimientoCaja";
DROP TABLE "MovimientoCaja";
ALTER TABLE "new_MovimientoCaja" RENAME TO "MovimientoCaja";
CREATE UNIQUE INDEX "MovimientoCaja_ventaId_key" ON "MovimientoCaja"("ventaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
