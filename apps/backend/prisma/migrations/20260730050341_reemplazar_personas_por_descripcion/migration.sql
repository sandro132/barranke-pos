/*
  Warnings:

  - You are about to drop the column `personas` on the `Espacio` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Espacio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'LIBRE',
    "capacidad" INTEGER,
    "horaApertura" DATETIME,
    "descripcion" TEXT,
    "espacioPadreId" TEXT,
    CONSTRAINT "Espacio_espacioPadreId_fkey" FOREIGN KEY ("espacioPadreId") REFERENCES "Espacio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Espacio" ("capacidad", "espacioPadreId", "estado", "horaApertura", "id", "nombre", "tipo") SELECT "capacidad", "espacioPadreId", "estado", "horaApertura", "id", "nombre", "tipo" FROM "Espacio";
DROP TABLE "Espacio";
ALTER TABLE "new_Espacio" RENAME TO "Espacio";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
