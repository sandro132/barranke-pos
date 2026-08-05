-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Promocion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "diasSemana" TEXT,
    "valor" DECIMAL,
    "productoId" TEXT,
    "cantidadRequerida" INTEGER,
    "precioCombo" DECIMAL,
    CONSTRAINT "Promocion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Promocion" ("activa", "diasSemana", "horaFin", "horaInicio", "id", "nombre", "tipo", "valor") SELECT "activa", "diasSemana", "horaFin", "horaInicio", "id", "nombre", "tipo", "valor" FROM "Promocion";
DROP TABLE "Promocion";
ALTER TABLE "new_Promocion" RENAME TO "Promocion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
