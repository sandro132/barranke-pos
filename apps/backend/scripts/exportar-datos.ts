/**
 * MIGRACIÓN AL SERVIDOR NUEVO — Paso 1: exportar todo.
 *
 * Vuelca cada tabla de la base de datos actual (SQLite) a un solo archivo
 * JSON. Es de solo lectura — no modifica nada de tu base de datos actual,
 * así que es completamente seguro correrlo.
 *
 * Uso: npm run migrar:exportar (desde apps/backend)
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Exportando todos los datos...");

  const datos = {
    usuarios: await prisma.usuario.findMany(),
    espacios: await prisma.espacio.findMany(),
    categorias: await prisma.categoria.findMany(),
    productos: await prisma.producto.findMany(),
    ingredientes: await prisma.ingrediente.findMany(),
    recetaItems: await prisma.recetaItem.findMany(),
    proveedores: await prisma.proveedor.findMany(),
    clientes: await prisma.cliente.findMany(),
    cuentas: await prisma.cuenta.findMany(),
    cajas: await prisma.caja.findMany(),
    compras: await prisma.compra.findMany(),
    itemsCompra: await prisma.itemCompra.findMany(),
    ventas: await prisma.venta.findMany(),
    pedidos: await prisma.pedido.findMany(),
    itemsPedido: await prisma.itemPedido.findMany(),
    movimientosInventario: await prisma.movimientoInventario.findMany(),
    movimientosCaja: await prisma.movimientoCaja.findMany(),
    movimientosCuentaCliente: await prisma.movimientoCuentaCliente.findMany(),
    promociones: await prisma.promocion.findMany(),
  };

  const conteos = Object.entries(datos)
    .map(([tabla, filas]) => `  ${tabla}: ${filas.length}`)
    .join("\n");
  console.log("Filas exportadas por tabla:");
  console.log(conteos);

  const rutaSalida = join(__dirname, "..", "datos-exportados.json");
  writeFileSync(rutaSalida, JSON.stringify(datos, null, 2));

  console.log("");
  console.log(`✔ Listo. Archivo guardado en: ${rutaSalida}`);
  console.log("Guárdalo en un lugar seguro — lo vas a necesitar para importar en el servidor nuevo.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
