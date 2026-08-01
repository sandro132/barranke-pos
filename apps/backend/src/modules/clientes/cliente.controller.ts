import { Request, Response } from "express";
import { asyncHandler, AppError } from "../../middlewares/errorHandler";
import * as clienteService from "./cliente.service";
import {
  actualizarClienteSchema,
  crearClienteSchema,
  registrarAbonoSchema,
} from "./cliente.schema";

export const listarHandler = asyncHandler(async (_req: Request, res: Response) => {
  const clientes = await clienteService.listarClientes();
  res.json(clientes);
});

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const cliente = await clienteService.obtenerCliente(req.params.id);
  res.json(cliente);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearClienteSchema.parse(req.body);
  const cliente = await clienteService.crearCliente(data);
  res.status(201).json(cliente);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarClienteSchema.parse(req.body);
  const cliente = await clienteService.actualizarCliente(req.params.id, data);
  res.json(cliente);
});

export const eliminarHandler = asyncHandler(async (req: Request, res: Response) => {
  await clienteService.eliminarCliente(req.params.id);
  res.status(204).send();
});

export const obtenerCuentaHandler = asyncHandler(async (req: Request, res: Response) => {
  const cuenta = await clienteService.obtenerCuenta(req.params.id);
  res.json(cuenta);
});

export const registrarAbonoHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = registrarAbonoSchema.parse(req.body);
  const cuenta = await clienteService.registrarAbono(req.params.id, req.user.userId, data);
  res.status(201).json(cuenta);
});
