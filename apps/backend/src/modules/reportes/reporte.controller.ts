import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as reporteService from "./reporte.service";

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
