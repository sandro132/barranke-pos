-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "prefijoSku" TEXT NOT NULL,
    "areaPreparacion" TEXT NOT NULL DEFAULT 'NINGUNA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");
CREATE UNIQUE INDEX "Categoria_prefijoSku_key" ON "Categoria"("prefijoSku");

-- Crea las 5 categorías que ya existían como lista fija, para que tus 27
-- productos actuales queden bien asignados y no se pierda nada.
INSERT INTO "Categoria" ("id", "nombre", "prefijoSku", "areaPreparacion", "createdAt") VALUES
  ('cat_cerveza', 'Cerveza', 'CERV', 'NINGUNA', CURRENT_TIMESTAMP),
  ('cat_licor', 'Licor', 'LICO', 'NINGUNA', CURRENT_TIMESTAMP),
  ('cat_comida', 'Comida', 'COMI', 'COCINA', CURRENT_TIMESTAMP),
  ('cat_coctel', 'Cóctel', 'COCT', 'BARRA', CURRENT_TIMESTAMP),
  ('cat_otro', 'Otro', 'OTRO', 'NINGUNA', CURRENT_TIMESTAMP);

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
    "unidad" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "codigoInterno" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Producto" ("id","nombre","categoriaId","precio","costo","stock","unidad","imagenUrl","activo","codigoInterno","createdAt","updatedAt")
SELECT
  "id","nombre",
  CASE "categoria"
    WHEN 'CERVEZA' THEN 'cat_cerveza'
    WHEN 'LICOR' THEN 'cat_licor'
    WHEN 'COMIDA' THEN 'cat_comida'
    WHEN 'COCTEL' THEN 'cat_coctel'
    ELSE 'cat_otro'
  END,
  "precio","costo","stock","unidad","imagenUrl","activo","codigoInterno","createdAt","updatedAt"
FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
CREATE UNIQUE INDEX "Producto_codigoInterno_key" ON "Producto"("codigoInterno");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;