-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ventaId" TEXT,
    CONSTRAINT "Pedido_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "Espacio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("createdAt", "espacioId", "estado", "id", "usuarioId") SELECT "createdAt", "espacioId", "estado", "id", "usuarioId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
