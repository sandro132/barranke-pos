import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as proveedorService from "./proveedor.service";
import { actualizarProveedorSchema, crearProveedorSchema } from "./proveedor.schema";

export const listarHandler = asyncHandler(async (_req: Request, res: Response) => {
  const proveedores = await proveedorService.listarProveedores();
  res.json(proveedores);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearProveedorSchema.parse(req.body);
  const proveedor = await proveedorService.crearProveedor(data);
  res.status(201).json(proveedor);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarProveedorSchema.parse(req.body);
  const proveedor = await proveedorService.actualizarProveedor(req.params.id, data);
  res.json(proveedor);
});

export const eliminarHandler = asyncHandler(async (req: Request, res: Response) => {
  await proveedorService.eliminarProveedor(req.params.id);
  res.status(204).send();
});
