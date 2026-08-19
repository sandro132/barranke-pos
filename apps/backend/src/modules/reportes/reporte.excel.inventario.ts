import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma";

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
    columna.width = Math.min(maxLength + 2, 40);
  });
}

// Nombres de pestaña de Excel: máximo 31 caracteres, y no pueden tener
// algunos símbolos (/ \ ? * [ ]) — se limpia para no romper el archivo.
function nombreDeHojaSeguro(nombre: string): string {
  return nombre.replace(/[/\\?*[\]]/g, "-").slice(0, 31);
}

/**
 * Un Excel del inventario TAL COMO ESTÁ AHORA (no de un rango de fechas):
 * una pestaña por categoría de producto, más una de ingredientes — pensado
 * para imprimir y hacer conteo físico en el local, comparando contra lo
 * que dice el sistema.
 */
export async function generarExcelInventarioActual() {
  const categorias = await prisma.categoria.findMany({
    include: { productos: { where: { activo: true }, orderBy: { nombre: "asc" } } },
    orderBy: { nombre: "asc" },
  });
  const ingredientes = await prisma.ingrediente.findMany({ orderBy: { nombre: "asc" } });

  const libro = new ExcelJS.Workbook();
  libro.creator = "Barranke Rock POS";
  libro.created = new Date();

  // ---- Resumen ----
  const hojaResumen = libro.addWorksheet("Resumen");
  hojaResumen.addRow(["Barranke Rock — Inventario actual"]).font = { bold: true, size: 14 };
  hojaResumen.addRow([`Generado: ${new Date().toLocaleString("es-CO")}`]);
  hojaResumen.addRow([]);
  const filaEncabezadoResumen = hojaResumen.addRow(["Categoría", "Productos", "Valor en stock"]);
  estilizarEncabezado(filaEncabezadoResumen);

  let valorTotalGeneral = 0;
  for (const cat of categorias) {
    const valorCategoria = cat.productos.reduce(
      (sum, p) => sum + Number(p.stock) * Number(p.costo),
      0
    );
    valorTotalGeneral += valorCategoria;
    const fila = hojaResumen.addRow([cat.nombre, cat.productos.length, valorCategoria]);
    fila.getCell(3).numFmt = FORMATO_MONEDA;
  }
  const valorIngredientes = ingredientes.reduce(
    (sum, i) => sum + Number(i.stock) * Number(i.costoUnitario),
    0
  );
  const filaIngredientes = hojaResumen.addRow(["Ingredientes", ingredientes.length, valorIngredientes]);
  filaIngredientes.getCell(3).numFmt = FORMATO_MONEDA;
  hojaResumen.addRow([]);
  const filaTotal = hojaResumen.addRow(["TOTAL", "", valorTotalGeneral + valorIngredientes]);
  filaTotal.font = { bold: true };
  filaTotal.getCell(3).numFmt = FORMATO_MONEDA;
  autoAjustarColumnas(hojaResumen);

  // ---- Una pestaña por categoría ----
  for (const cat of categorias) {
    if (cat.productos.length === 0) continue;

    const hoja = libro.addWorksheet(nombreDeHojaSeguro(cat.nombre));
    hoja.addRow(["Código", "Producto", "Stock actual", "Unidad", "Stock mínimo", "Costo c/u", "Valor en stock", "Precio venta"]);
    estilizarEncabezado(hoja.getRow(1));

    for (const p of cat.productos) {
      const valor = Number(p.stock) * Number(p.costo);
      const fila = hoja.addRow([
        p.codigoInterno,
        p.nombre,
        Number(p.stock),
        p.unidad,
        Number(p.stockMinimo),
        Number(p.costo),
        valor,
        Number(p.precio),
      ]);
      fila.getCell(6).numFmt = FORMATO_MONEDA;
      fila.getCell(7).numFmt = FORMATO_MONEDA;
      fila.getCell(8).numFmt = FORMATO_MONEDA;
      // Resalta en la misma fila si el stock ya está en o por debajo del mínimo.
      if (Number(p.stockMinimo) > 0 && Number(p.stock) <= Number(p.stockMinimo)) {
        fila.eachCell((celda) => {
          celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4E4" } };
        });
      }
    }
    autoAjustarColumnas(hoja);
  }

  // ---- Ingredientes ----
  if (ingredientes.length > 0) {
    const hojaIngredientes = libro.addWorksheet("Ingredientes");
    hojaIngredientes.addRow(["Ingrediente", "Stock actual", "Unidad", "Stock mínimo", "Costo unitario", "Valor en stock"]);
    estilizarEncabezado(hojaIngredientes.getRow(1));

    for (const i of ingredientes) {
      const valor = Number(i.stock) * Number(i.costoUnitario);
      const fila = hojaIngredientes.addRow([
        i.nombre,
        Number(i.stock),
        i.unidad,
        Number(i.stockMinimo),
        Number(i.costoUnitario),
        valor,
      ]);
      fila.getCell(5).numFmt = FORMATO_MONEDA;
      fila.getCell(6).numFmt = FORMATO_MONEDA;
      if (Number(i.stockMinimo) > 0 && Number(i.stock) <= Number(i.stockMinimo)) {
        fila.eachCell((celda) => {
          celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4E4" } };
        });
      }
    }
    autoAjustarColumnas(hojaIngredientes);
  }

  return libro.xlsx.writeBuffer();
}
