/**
 * MIGRACIÓN AL SERVIDOR NUEVO — Paso 2: importar todo.
 *
 * Lee el archivo que generó exportar-datos.ts y recrea cada fila en la
 * base de datos NUEVA (a la que esté apuntando DATABASE_URL en este momento
 * — verifica que sea la de Railway antes de correr esto, no la vieja).
 *
 * Inserta en un orden específico para que las relaciones (foreign keys)
 * siempre encuentren lo que necesitan ya creado. Conserva los mismos IDs
 * que tenían antes, así que es seguro correrlo una sola vez sobre una base
 * de datos NUEVA y vacía — si la corres dos veces, va a fallar por IDs
 * duplicados (que es la señal correcta: significa que ya se había importado).
 *
 * Uso: npm run migrar:importar (desde apps/backend, con DATABASE_URL
 * apuntando a la base de datos nueva)
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// Revive automáticamente cualquier string con pinta de fecha ISO a un
// objeto Date real — sin esto, Prisma rechaza las fechas como texto plano.
function reviverFechas(_key: string, value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
}

async function main() {
  const rutaEntrada = join(__dirname, "..", "datos-exportados.json");
  console.log(`Leyendo ${rutaEntrada}...`);
  const datos = JSON.parse(readFileSync(rutaEntrada, "utf-8"), reviverFechas);

  // El orden importa: cada tabla se inserta después de todo lo que referencia.
  // Cuenta.cuentaPadreId es la única auto-referencia — se limpia en la
  // primera pasada y se restaura al final, en una segunda pasada.
  console.log("Importando (esto puede tardar unos minutos)...");

  await prisma.usuario.createMany({ data: datos.usuarios });
  console.log(`  ✔ usuarios: ${datos.usuarios.length}`);

  await prisma.espacio.createMany({ data: datos.espacios });
  console.log(`  ✔ espacios: ${datos.espacios.length}`);

  await prisma.categoria.createMany({ data: datos.categorias });
  console.log(`  ✔ categorias: ${datos.categorias.length}`);

  await prisma.producto.createMany({ data: datos.productos });
  console.log(`  ✔ productos: ${datos.productos.length}`);

  await prisma.ingrediente.createMany({ data: datos.ingredientes });
  console.log(`  ✔ ingredientes: ${datos.ingredientes.length}`);

  await prisma.recetaItem.createMany({ data: datos.recetaItems });
  console.log(`  ✔ recetaItems: ${datos.recetaItems.length}`);

  await prisma.proveedor.createMany({ data: datos.proveedores });
  console.log(`  ✔ proveedores: ${datos.proveedores.length}`);

  await prisma.cliente.createMany({ data: datos.clientes });
  console.log(`  ✔ clientes: ${datos.clientes.length}`);

  await prisma.cuenta.createMany({
    data: datos.cuentas.map((c: Record<string, unknown>) => ({ ...c, cuentaPadreId: null })),
  });
  console.log(`  ✔ cuentas: ${datos.cuentas.length}`);

  await prisma.caja.createMany({ data: datos.cajas });
  console.log(`  ✔ cajas: ${datos.cajas.length}`);

  await prisma.compra.createMany({ data: datos.compras });
  console.log(`  ✔ compras: ${datos.compras.length}`);

  await prisma.itemCompra.createMany({ data: datos.itemsCompra });
  console.log(`  ✔ itemsCompra: ${datos.itemsCompra.length}`);

  await prisma.venta.createMany({ data: datos.ventas });
  console.log(`  ✔ ventas: ${datos.ventas.length}`);

  await prisma.pedido.createMany({ data: datos.pedidos });
  console.log(`  ✔ pedidos: ${datos.pedidos.length}`);

  await prisma.itemPedido.createMany({ data: datos.itemsPedido });
  console.log(`  ✔ itemsPedido: ${datos.itemsPedido.length}`);

  await prisma.movimientoInventario.createMany({ data: datos.movimientosInventario });
  console.log(`  ✔ movimientosInventario: ${datos.movimientosInventario.length}`);

  await prisma.movimientoCaja.createMany({ data: datos.movimientosCaja });
  console.log(`  ✔ movimientosCaja: ${datos.movimientosCaja.length}`);

  await prisma.movimientoCuentaCliente.createMany({ data: datos.movimientosCuentaCliente });
  console.log(`  ✔ movimientosCuentaCliente: ${datos.movimientosCuentaCliente.length}`);

  await prisma.promocion.createMany({ data: datos.promociones });
  console.log(`  ✔ promociones: ${datos.promociones.length}`);

  // Segunda pasada: restaura las cuentas unidas a otra cuenta.
  const cuentasUnidas = datos.cuentas.filter((c: { cuentaPadreId: string | null }) => c.cuentaPadreId);
  for (const c of cuentasUnidas) {
    await prisma.cuenta.update({ where: { id: c.id }, data: { cuentaPadreId: c.cuentaPadreId } });
  }
  console.log(`  ✔ cuentas unidas restauradas: ${cuentasUnidas.length}`);

  console.log("");
  console.log("🎸 Importación completa.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    console.error("");
    console.error(
      "Si el error es de IDs duplicados, probablemente ya habías corrido este script antes — revisa la base de datos antes de reintentar."
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
