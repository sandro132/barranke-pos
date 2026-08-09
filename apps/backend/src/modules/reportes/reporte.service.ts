import { prisma } from "../../lib/prisma";
import { EstadoPedido, TipoMovimientoInventario } from "@barranke/shared";

/**
 * Todos los reportes reciben un rango de fechas opcional (desde/hasta, formato
 * YYYY-MM-DD). Si no se especifica, el rango por defecto es "lo que va del mes".
 */
function resolverRango(desde?: string, hasta?: string) {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  return {
    desdeDate: desde ? new Date(`${desde}T00:00:00`) : inicioMes,
    hastaDate: hasta ? new Date(`${hasta}T23:59:59.999`) : ahora,
  };
}

function formatearPeriodo(fecha: Date, agrupacion: "dia" | "mes" | "anio"): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  if (agrupacion === "anio") return `${y}`;
  if (agrupacion === "mes") return `${y}-${m}`;
  return `${y}-${m}-${d}`;
}

export async function reporteVentas(
  desde: string | undefined,
  hasta: string | undefined,
  agrupacion: "dia" | "mes" | "anio"
) {
  const { desdeDate, hastaDate } = resolverRango(desde, hasta);

  const ventas = await prisma.venta.findMany({
    where: { fecha: { gte: desdeDate, lte: hastaDate } },
    select: { fecha: true, total: true },
    orderBy: { fecha: "asc" },
  });

  const grupos = new Map<string, { total: number; cantidad: number }>();

  for (const venta of ventas) {
    const clave = formatearPeriodo(venta.fecha, agrupacion);
    const actual = grupos.get(clave) ?? { total: 0, cantidad: 0 };
    actual.total += Number(venta.total);
    actual.cantidad += 1;
    grupos.set(clave, actual);
  }

  return Array.from(grupos.entries())
    .map(([periodo, datos]) => ({ periodo, ...datos }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

/**
 * Solo cuenta ítems de pedidos que ya quedaron vinculados a una Venta (mesa
 * cerrada y pagada) — no pedidos de mesas todavía abiertas. Esta es la
 * fuente compartida para productos, ganancias y categorías, para que los
 * tres reportes siempre cuenten exactamente lo mismo.
 */
async function obtenerItemsVendidos(desdeDate: Date, hastaDate: Date) {
  return prisma.itemPedido.findMany({
    where: {
      estado: { not: EstadoPedido.CANCELADO },
      pedido: {
        ventaId: { not: null },
        venta: { fecha: { gte: desdeDate, lte: hastaDate } },
      },
    },
    include: { producto: { include: { categoria: true } } },
  });
}

export async function reporteProductos(desde?: string, hasta?: string) {
  const { desdeDate, hastaDate } = resolverRango(desde, hasta);
  const items = await obtenerItemsVendidos(desdeDate, hastaDate);

  const porProducto = new Map<
    string,
    { nombre: string; categoria: string; cantidad: number; ingresos: number }
  >();

  for (const item of items) {
    const actual = porProducto.get(item.productoId) ?? {
      nombre: item.producto.nombre,
      categoria: item.producto.categoria.nombre,
      cantidad: 0,
      ingresos: 0,
    };
    actual.cantidad += item.cantidad;
    actual.ingresos += Number(item.precioUnitario) * item.cantidad;
    porProducto.set(item.productoId, actual);
  }

  // Incluye productos activos sin ventas en el rango en 0, para que
  // "menos vendidos" también muestre lo que no se ha movido nada.
  const productosActivos = await prisma.producto.findMany({
    where: { activo: true },
    include: { categoria: true },
  });
  for (const p of productosActivos) {
    if (!porProducto.has(p.id)) {
      porProducto.set(p.id, {
        nombre: p.nombre,
        categoria: p.categoria.nombre,
        cantidad: 0,
        ingresos: 0,
      });
    }
  }

  const lista = Array.from(porProducto.values());

  return {
    masVendidos: [...lista].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10),
    menosVendidos: [...lista].sort((a, b) => a.cantidad - b.cantidad).slice(0, 10),
  };
}

export async function reporteGanancias(desde?: string, hasta?: string) {
  const { desdeDate, hastaDate } = resolverRango(desde, hasta);
  const items = await obtenerItemsVendidos(desdeDate, hastaDate);

  let ingresos = 0;
  let costos = 0;

  for (const item of items) {
    ingresos += Number(item.precioUnitario) * item.cantidad;
    costos += Number(item.producto.costo) * item.cantidad;
  }

  const ganancia = ingresos - costos;
  const margen = ingresos > 0 ? (ganancia / ingresos) * 100 : 0;

  return { ingresos, costos, ganancia, margen };
}

export async function reporteMetodosPago(desde?: string, hasta?: string) {
  const { desdeDate, hastaDate } = resolverRango(desde, hasta);

  const ventas = await prisma.venta.findMany({
    where: { fecha: { gte: desdeDate, lte: hastaDate } },
    select: { metodoPago: true, total: true },
  });

  const porMetodo = new Map<string, number>();
  for (const v of ventas) {
    porMetodo.set(v.metodoPago, (porMetodo.get(v.metodoPago) ?? 0) + Number(v.total));
  }

  return Array.from(porMetodo.entries()).map(([metodo, total]) => ({ metodo, total }));
}

export async function reporteCategorias(desde?: string, hasta?: string) {
  const { desdeDate, hastaDate } = resolverRango(desde, hasta);
  const items = await obtenerItemsVendidos(desdeDate, hastaDate);

  const porCategoria = new Map<string, { cantidad: number; total: number }>();
  for (const item of items) {
    const nombreCategoria = item.producto.categoria.nombre;
    const actual = porCategoria.get(nombreCategoria) ?? { cantidad: 0, total: 0 };
    actual.cantidad += item.cantidad;
    actual.total += Number(item.precioUnitario) * item.cantidad;
    porCategoria.set(nombreCategoria, actual);
  }

  return Array.from(porCategoria.entries()).map(([categoria, datos]) => ({ categoria, ...datos }));
}

export async function reporteInventario() {
  const [productos, ingredientes] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true } }),
    prisma.ingrediente.findMany(),
  ]);

  const valorProductos = productos.reduce((sum, p) => sum + Number(p.stock) * Number(p.costo), 0);
  const valorIngredientes = ingredientes.reduce(
    (sum, i) => sum + Number(i.stock) * Number(i.costoUnitario),
    0
  );

  const stockBajoIngredientes = ingredientes
    .filter((i) => Number(i.stock) <= Number(i.stockMinimo))
    .map((i) => ({
      id: i.id,
      tipo: "ingrediente" as const,
      nombre: i.nombre,
      stock: Number(i.stock),
      stockMinimo: Number(i.stockMinimo),
      unidad: i.unidad,
    }));

  // Solo alerta productos que de verdad configuraron un mínimo (stockMinimo > 0)
  // — a diferencia de ingredientes, muchos productos no llevan control de
  // stock mínimo y no tendría sentido alertar por defecto en 0.
  const stockBajoProductos = productos
    .filter((p) => Number(p.stockMinimo) > 0 && Number(p.stock) <= Number(p.stockMinimo))
    .map((p) => ({
      id: p.id,
      tipo: "producto" as const,
      nombre: p.nombre,
      stock: Number(p.stock),
      stockMinimo: Number(p.stockMinimo),
      unidad: p.unidad,
    }));

  const stockBajo = [...stockBajoProductos, ...stockBajoIngredientes];

  return {
    valorTotal: valorProductos + valorIngredientes,
    valorProductos,
    valorIngredientes,
    stockBajo,
  };
}

/**
 * Cuánto le "costó" al bar el consumo interno del personal en un rango de
 * fechas — usando el costo ACTUAL de cada producto/ingrediente (no el que
 * tenía el día exacto del consumo, ya que no se guarda un histórico de
 * costos). Es una aproximación razonable: sirve para ver la magnitud del
 * gasto, no para un centavo exacto de contabilidad.
 */
export async function reporteConsumoInterno(desde?: string, hasta?: string) {
  const { desdeDate, hastaDate } = resolverRango(desde, hasta);

  const movimientos = await prisma.movimientoInventario.findMany({
    where: {
      tipo: TipoMovimientoInventario.CONSUMO_INTERNO,
      fecha: { gte: desdeDate, lte: hastaDate },
    },
    include: {
      producto: { select: { nombre: true, costo: true } },
      ingrediente: { select: { nombre: true, costoUnitario: true } },
      usuario: { select: { nombre: true } },
    },
  });

  let totalCosto = 0;
  const porUsuario = new Map<string, { nombre: string; costo: number; cantidad: number }>();
  const porItem = new Map<string, { nombre: string; costo: number; cantidad: number }>();

  for (const m of movimientos) {
    const costoUnitario = m.producto ? Number(m.producto.costo) : Number(m.ingrediente?.costoUnitario ?? 0);
    const costo = costoUnitario * Number(m.cantidad);
    totalCosto += costo;

    const nombreUsuario = m.usuario?.nombre ?? "Sin usuario";
    const actualUsuario = porUsuario.get(nombreUsuario) ?? { nombre: nombreUsuario, costo: 0, cantidad: 0 };
    actualUsuario.costo += costo;
    actualUsuario.cantidad += 1;
    porUsuario.set(nombreUsuario, actualUsuario);

    const nombreItem = m.producto?.nombre ?? m.ingrediente?.nombre ?? "—";
    const actualItem = porItem.get(nombreItem) ?? { nombre: nombreItem, costo: 0, cantidad: 0 };
    actualItem.costo += costo;
    actualItem.cantidad += Number(m.cantidad);
    porItem.set(nombreItem, actualItem);
  }

  return {
    totalCosto,
    totalMovimientos: movimientos.length,
    porUsuario: Array.from(porUsuario.values()).sort((a, b) => b.costo - a.costo),
    porItem: Array.from(porItem.values()).sort((a, b) => b.costo - a.costo),
  };
}

/**
 * Cuánto se ha gastado en compras en un rango de fechas, desglosado por
 * proveedor y por producto/ingrediente comprado — para responder "¿a quién
 * le compro más?" y "¿qué estoy comprando más seguido?".
 */
export async function reporteCompras(desde?: string, hasta?: string) {
  const { desdeDate, hastaDate } = resolverRango(desde, hasta);

  const compras = await prisma.compra.findMany({
    where: { fecha: { gte: desdeDate, lte: hastaDate } },
    include: {
      proveedor: { select: { nombre: true } },
      items: {
        include: {
          producto: { select: { nombre: true } },
          ingrediente: { select: { nombre: true } },
        },
      },
    },
  });

  const totalGastado = compras.reduce((sum, c) => sum + Number(c.total), 0);

  const porProveedor = new Map<string, { nombre: string; total: number; cantidadCompras: number }>();
  for (const c of compras) {
    const actual = porProveedor.get(c.proveedorId) ?? {
      nombre: c.proveedor.nombre,
      total: 0,
      cantidadCompras: 0,
    };
    actual.total += Number(c.total);
    actual.cantidadCompras += 1;
    porProveedor.set(c.proveedorId, actual);
  }

  const porItem = new Map<string, { nombre: string; cantidad: number; total: number }>();
  for (const c of compras) {
    for (const item of c.items) {
      const nombre = item.producto?.nombre ?? item.ingrediente?.nombre ?? "—";
      const clave = item.productoId ?? item.ingredienteId ?? nombre;
      const actual = porItem.get(clave) ?? { nombre, cantidad: 0, total: 0 };
      actual.cantidad += Number(item.cantidad);
      actual.total += Number(item.cantidad) * Number(item.costoUnitario);
      porItem.set(clave, actual);
    }
  }

  return {
    totalGastado,
    totalCompras: compras.length,
    porProveedor: Array.from(porProveedor.values()).sort((a, b) => b.total - a.total),
    porItem: Array.from(porItem.values()).sort((a, b) => b.total - a.total),
  };
}
