/**
 * ETAPA A — Paso 2: traduce el historial existente (ventas y pedidos, hasta
 * ahora vinculados directo a un Espacio) al nuevo modelo de Cuentas.
 *
 * Por cada Venta ya cerrada, crea una Cuenta "CERRADA" con el nombre de la
 * mesa donde ocurrió (es la mejor información disponible retroactivamente
 * — el nombre real del cliente no se guardaba antes), y vincula esa venta
 * y sus pedidos a esa cuenta nueva.
 *
 * Es seguro correrlo más de una vez: solo toca ventas/pedidos que todavía
 * no tengan cuentaId asignado.
 *
 * Uso: npm run migrar:cuentas (desde apps/backend)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrando historial de Ventas a Cuentas...");

  const ventasSinCuenta = await prisma.venta.findMany({
    where: { cuentaId: null },
    include: { espacio: true, pedidos: true },
  });

  console.log(`  Encontradas ${ventasSinCuenta.length} ventas sin cuenta.`);

  for (const venta of ventasSinCuenta) {
    const cuenta = await prisma.cuenta.create({
      data: {
        nombre: venta.espacio.nombre,
        estado: "CERRADA",
        horaApertura: venta.fecha,
        espacioId: venta.espacioId,
        usuarioId: venta.usuarioId,
        createdAt: venta.fecha,
      },
    });

    await prisma.venta.update({ where: { id: venta.id }, data: { cuentaId: cuenta.id } });

    await prisma.pedido.updateMany({
      where: { id: { in: venta.pedidos.map((p) => p.id) } },
      data: { cuentaId: cuenta.id },
    });
  }

  console.log("  ✔ Ventas migradas.");

  // Pedidos "huérfanos": nunca llegaron a generar una venta (ej. una mesa
  // que se cerró con $0 consumido). Se agrupan por mesa y se les crea una
  // cuenta cerrada también, para no dejarlos sueltos.
  console.log("Migrando pedidos sin venta asociada...");

  const pedidosSinCuenta = await prisma.pedido.findMany({
    where: { cuentaId: null },
    include: { espacio: true },
  });

  console.log(`  Encontrados ${pedidosSinCuenta.length} pedidos sin cuenta.`);

  const porEspacio = new Map<string, typeof pedidosSinCuenta>();
  for (const pedido of pedidosSinCuenta) {
    const lista = porEspacio.get(pedido.espacioId) ?? [];
    lista.push(pedido);
    porEspacio.set(pedido.espacioId, lista);
  }

  for (const [espacioId, pedidos] of porEspacio) {
    const espacio = pedidos[0].espacio;
    const cuenta = await prisma.cuenta.create({
      data: {
        nombre: espacio.nombre,
        estado: "CERRADA",
        horaApertura: pedidos[0].createdAt,
        espacioId,
        usuarioId: pedidos[0].usuarioId,
        createdAt: pedidos[0].createdAt,
      },
    });

    await prisma.pedido.updateMany({
      where: { id: { in: pedidos.map((p) => p.id) } },
      data: { cuentaId: cuenta.id },
    });
  }

  console.log("  ✔ Pedidos huérfanos migrados.");
  console.log("");
  console.log("🎸 Listo. Revisa que los números cuadren antes de seguir con la Etapa B.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
