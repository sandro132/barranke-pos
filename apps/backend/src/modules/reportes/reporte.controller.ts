import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as reporteService from "./reporte.service";
import { generarExcelReportes } from "./reporte.excel";
import { generarExcelInventarioActual } from "./reporte.excel.inventario";

function rango(req: Request) {
  const { desde, hasta } = req.query;
  return { desde: desde as string | undefined, hasta: hasta as string | undefined };
}

export const ventasHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const agrupacion = (req.query.agrupacion as "dia" | "mes" | "anio") ?? "dia";
  const datos = await reporteService.reporteVentas(desde, hasta, agrupacion);
  res.json(datos);
});

export const productosHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const datos = await reporteService.reporteProductos(desde, hasta);
  res.json(datos);
});

export const gananciasHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const datos = await reporteService.reporteGanancias(desde, hasta);
  res.json(datos);
});

export const metodosPagoHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const datos = await reporteService.reporteMetodosPago(desde, hasta);
  res.json(datos);
});

export const categoriasHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const datos = await reporteService.reporteCategorias(desde, hasta);
  res.json(datos);
});

export const inventarioHandler = asyncHandler(async (_req: Request, res: Response) => {
  const datos = await reporteService.reporteInventario();
  res.json(datos);
});

export const consumoInternoHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const datos = await reporteService.reporteConsumoInterno(desde, hasta);
  res.json(datos);
});

export const comprasHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const datos = await reporteService.reporteCompras(desde, hasta);
  res.json(datos);
});

export const excelHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = rango(req);
  const buffer = await generarExcelReportes(desde, hasta);

  const nombreArchivo = `reporte-barranke-${desde ?? "mes-actual"}-a-${hasta ?? "hoy"}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
  res.send(buffer);
});

export const excelInventarioHandler = asyncHandler(async (_req: Request, res: Response) => {
  const buffer = await generarExcelInventarioActual();

  const nombreArchivo = `inventario-barranke-${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
  res.send(buffer);
});
