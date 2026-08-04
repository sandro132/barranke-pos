/**
 * Borra TODOS los datos de prueba (productos, ingredientes, recetas, ventas,
 * pedidos, compras, caja, clientes, promociones) para dejar el sistema listo
 * para empezar a operar con datos reales desde hoy.
 *
 * Lo único que se conserva:
 *  - Tu usuario y contraseña (el login no se toca)
 *  - Las mesas y barras (Mesa 1-5, Barra 2-6, Barra Ventana), pero reseteadas
 *    a estado LIBRE, sin mesas unidas ni pedidos abiertos.
 *
 * Uso: npm run reset:prueba (desde apps/backend)
 * Pide confirmación escrita antes de borrar nada — no hace nada si no
 * escribes exactamente "BORRAR TODO".
 */
import readline from "readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function preguntar(pregunta: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  console.log("⚠️  Esto va a borrar TODOS los datos de prueba:");
  console.log("   Productos, ingredientes, recetas, ventas, pedidos,");
  console.log("   compras, caja, clientes y promociones.");
  console.log("");
  console.log("   Se conservan: tu usuario/login y las mesas/barras (libres).");
  console.log("");
  console.log("   Esto NO SE PUEDE deshacer.");
  console.log("");

  const respuesta = await preguntar('Escribe exactamente "BORRAR TODO" para confirmar: ');

  if (respuesta !== "BORRAR TODO") {
    console.log("Cancelado. No se borró nada.");
    process.exit(0);
  }

  console.log("");
  console.log("Borrando...");

  // Orden importante: primero lo que depende de otras tablas, al final lo
  // más "raíz". Si esto se hace en el orden equivocado, Prisma tira error
  // de llave foránea y no borra nada (así que si falla a medias, es seguro).
  await prisma.movimientoCuentaCliente.deleteMany();
  console.log("  ✔ Movimientos de cuenta de clientes");

  await prisma.itemPedido.deleteMany();
  console.log("  ✔ Ítems de pedidos");

  await prisma.pedido.deleteMany();
  console.log("  ✔ Pedidos");

  await prisma.movimientoInventario.deleteMany();
  console.log("  ✔ Movimientos de inventario");

  await prisma.recetaItem.deleteMany();
  console.log("  ✔ Recetas");

  await prisma.itemCompra.deleteMany();
  console.log("  ✔ Ítems de compras");

  await prisma.compra.deleteMany();
  console.log("  ✔ Compras");

  await prisma.venta.deleteMany();
  console.log("  ✔ Ventas");

  await prisma.movimientoCaja.deleteMany();
  console.log("  ✔ Movimientos de caja");

  await prisma.caja.deleteMany();
  console.log("  ✔ Cajas");

  await prisma.producto.deleteMany();
  console.log("  ✔ Productos");

  await prisma.ingrediente.deleteMany();
  console.log("  ✔ Ingredientes");

  await prisma.cliente.deleteMany();
  console.log("  ✔ Clientes");

  await prisma.promocion.deleteMany();
  console.log("  ✔ Promociones");

  // Las mesas y barras NO se borran: solo se resetean a libres, por si
  // alguna quedó ocupada o unida a otra de las pruebas.
  await prisma.espacio.updateMany({
    data: {
      estado: "LIBRE",
      horaApertura: null,
      descripcion: null,
      espacioPadreId: null,
    },
  });
  console.log("  ✔ Mesas y barras reseteadas a Libre (se conservaron)");

  console.log("");
  console.log("🎸 Listo. El sistema está limpio y listo para datos reales desde hoy.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
