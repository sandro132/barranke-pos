import ExcelJS from "exceljs";
import * as reporteService from "./reporte.service";
import * as gastoService from "../gastos/gasto.service";

const FORMATO_MONEDA = '"$"#,##0';

function estilizarEncabezado(fila: ExcelJS.Row) {
  fila.font = { bold: true, color: { argb: "FFFFFFFF" } };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C3C" } };
  fila.alignment = { vertical: "middle" };
}

function autoAjustarColumnas(hoja: ExcelJS.Worksheet) {
  hoja.columns.forEach((columna) => {
    let maxLength = 10;
    columna.eachCell?.({ includeEmpty: false }, (celda) => {
      const largo = String(celda.value ?? "").length;
      if (largo > maxLength) maxLength = largo;
    });
    columna.width = Math.min(maxLength + 2, 45);
  });
}

/**
 * Junta todos los reportes del rango de fechas en un solo archivo Excel,
 * con una pestaña por tema — pensado para llevarle los números a un
 * contador o para hacer cuentas de fin de mes fuera del sistema.
 */
export async function generarExcelReportes(desde?: string, hasta?: string) {
  const [ventas, ganancias, productos, metodosPago, categorias, inventario, consumoInterno, compras, gastos] =
    await Promise.all([
      reporteService.reporteVentas(desde, hasta, "dia"),
      reporteService.reporteGanancias(desde, hasta),
      reporteService.reporteProductos(desde, hasta),
      reporteService.reporteMetodosPago(desde, hasta),
      reporteService.reporteCategorias(desde, hasta),
      reporteService.reporteInventario(),
      reporteService.reporteConsumoInterno(desde, hasta),
      reporteService.reporteCompras(desde, hasta),
      gastoService.listarGastos(desde, hasta),
    ]);

  const libro = new ExcelJS.Workbook();
  libro.creator = "Barranke Rock POS";
  libro.created = new Date();

  // ---- Resumen ----
  const hojaResumen = libro.addWorksheet("Resumen");
  hojaResumen.addRow(["Barranke Rock — Reporte financiero"]).font = { bold: true, size: 14 };
  hojaResumen.addRow([`Rango: ${desde ?? "inicio del mes"} — ${hasta ?? "hoy"}`]);
  hojaResumen.addRow([]);
  const filasResumen = [
    ["Ingresos", ganancias.ingresos],
    ["Costo de productos", ganancias.costos],
    ["Ganancia bruta", ganancias.gananciaBruta],
    ["Margen bruto (%)", Number(ganancias.margenBruto.toFixed(1))],
    ["Gastos operativos (arriendo, servicios, nómina...)", ganancias.gastosOperativos],
    ["Ganancia neta (real)", ganancias.gananciaNeta],
    ["Margen neto (%)", Number(ganancias.margenNeto.toFixed(1))],
    ["Total comprado (inventario)", compras.totalGastado],
    ["Costo consumo interno", consumoInterno.totalCosto],
  ];
  for (const [etiqueta, valor] of filasResumen) {
    const fila = hojaResumen.addRow([etiqueta, valor]);
    if (typeof valor === "number" && !String(etiqueta).includes("%")) {
      fila.getCell(2).numFmt = FORMATO_MONEDA;
    }
  }
  hojaResumen.getColumn(1).width = 24;
  hojaResumen.getColumn(2).width = 18;

  // ---- Ventas por día ----
  const hojaVentas = libro.addWorksheet("Ventas por día");
  hojaVentas.addRow(["Fecha", "Ventas", "Total"]);
  estilizarEncabezado(hojaVentas.getRow(1));
  for (const v of ventas) {
    const fila = hojaVentas.addRow([v.periodo, v.cantidad, v.total]);
    fila.getCell(3).numFmt = FORMATO_MONEDA;
  }
  autoAjustarColumnas(hojaVentas);

  // ---- Productos ----
  const hojaProductos = libro.addWorksheet("Productos");
  hojaProductos.addRow(["Más vendidos", "", "", "", "Menos vendidos", "", ""]);
  hojaProductos.addRow(["Producto", "Categoría", "Cantidad", "Ingresos", "Producto", "Categoría", "Cantidad"]);
  estilizarEncabezado(hojaProductos.getRow(2));
  const maxFilas = Math.max(productos.masVendidos.length, productos.menosVendidos.length);
  for (let i = 0; i < maxFilas; i++) {
    const mas = productos.masVendidos[i];
    const menos = productos.menosVendidos[i];
    const fila = hojaProductos.addRow([
      mas?.nombre ?? "",
      mas?.categoria ?? "",
      mas?.cantidad ?? "",
      mas?.ingresos ?? "",
      menos?.nombre ?? "",
      menos?.categoria ?? "",
      menos?.cantidad ?? "",
    ]);
    if (mas) fila.getCell(4).numFmt = FORMATO_MONEDA;
  }
  autoAjustarColumnas(hojaProductos);

  // ---- Métodos de pago ----
  const hojaMetodos = libro.addWorksheet("Métodos de pago");
  hojaMetodos.addRow(["Método", "Total"]);
  estilizarEncabezado(hojaMetodos.getRow(1));
  for (const m of metodosPago) {
    const fila = hojaMetodos.addRow([m.metodo, m.total]);
    fila.getCell(2).numFmt = FORMATO_MONEDA;
  }
  autoAjustarColumnas(hojaMetodos);

  // ---- Categorías ----
  const hojaCategorias = libro.addWorksheet("Categorías");
  hojaCategorias.addRow(["Categoría", "Cantidad vendida", "Ingresos"]);
  estilizarEncabezado(hojaCategorias.getRow(1));
  for (const c of categorias) {
    const fila = hojaCategorias.addRow([c.categoria, c.cantidad, c.total]);
    fila.getCell(3).numFmt = FORMATO_MONEDA;
  }
  autoAjustarColumnas(hojaCategorias);

  // ---- Inventario ----
  const hojaInventario = libro.addWorksheet("Inventario");
  hojaInventario.addRow(["Valor total del inventario", inventario.valorTotal]).getCell(2).numFmt =
    FORMATO_MONEDA;
  hojaInventario.addRow(["Valor en productos", inventario.valorProductos]).getCell(2).numFmt =
    FORMATO_MONEDA;
  hojaInventario.addRow(["Valor en ingredientes", inventario.valorIngredientes]).getCell(2).numFmt =
    FORMATO_MONEDA;
  hojaInventario.addRow([]);
  hojaInventario.addRow(["Stock bajo", "", "", ""]);
  const filaEncabezadoStock = hojaInventario.addRow(["Nombre", "Tipo", "Stock", "Mínimo"]);
  estilizarEncabezado(filaEncabezadoStock);
  for (const s of inventario.stockBajo) {
    hojaInventario.addRow([s.nombre, s.tipo, s.stock, s.stockMinimo]);
  }
  autoAjustarColumnas(hojaInventario);

  // ---- Consumo interno ----
  const hojaConsumo = libro.addWorksheet("Consumo interno");
  hojaConsumo.addRow(["Total movimientos", consumoInterno.totalMovimientos]);
  hojaConsumo.addRow(["Costo total", consumoInterno.totalCosto]).getCell(2).numFmt = FORMATO_MONEDA;
  hojaConsumo.addRow([]);
  const filaEncabezadoConsumo = hojaConsumo.addRow(["Por persona", "Costo", "Cantidad de movimientos"]);
  estilizarEncabezado(filaEncabezadoConsumo);
  for (const u of consumoInterno.porUsuario) {
    const fila = hojaConsumo.addRow([u.nombre, u.costo, u.cantidad]);
    fila.getCell(2).numFmt = FORMATO_MONEDA;
  }
  autoAjustarColumnas(hojaConsumo);

  // ---- Gastos operativos ----
  const hojaGastos = libro.addWorksheet("Gastos operativos");
  hojaGastos.addRow(["Fecha", "Concepto", "Categoría", "Monto", "Notas"]);
  estilizarEncabezado(hojaGastos.getRow(1));
  for (const g of gastos) {
    const fila = hojaGastos.addRow([
      g.fecha.toISOString().slice(0, 10),
      g.concepto,
      g.categoria,
      Number(g.monto),
      g.notas ?? "",
    ]);
    fila.getCell(4).numFmt = FORMATO_MONEDA;
  }
  autoAjustarColumnas(hojaGastos);

  // ---- Compras ----
  const hojaCompras = libro.addWorksheet("Compras");
  hojaCompras.addRow(["Total gastado", compras.totalGastado]).getCell(2).numFmt = FORMATO_MONEDA;
  hojaCompras.addRow(["Cantidad de compras", compras.totalCompras]);
  hojaCompras.addRow([]);
  const filaEncabezadoProveedor = hojaCompras.addRow(["Proveedor", "Total", "Cantidad de compras"]);
  estilizarEncabezado(filaEncabezadoProveedor);
  for (const p of compras.porProveedor) {
    const fila = hojaCompras.addRow([p.nombre, p.total, p.cantidadCompras]);
    fila.getCell(2).numFmt = FORMATO_MONEDA;
  }
  autoAjustarColumnas(hojaCompras);

  return libro.xlsx.writeBuffer();
}
