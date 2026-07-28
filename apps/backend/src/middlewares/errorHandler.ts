import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/**
 * Error de aplicación con código HTTP explícito.
 * Los services lanzan este error cuando algo falla por una razón de negocio conocida
 * (ej. "credenciales inválidas", "producto sin stock").
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

/**
 * Middleware de errores. Debe registrarse al final de todos los middlewares/rutas.
 * Traduce distintos tipos de error a una respuesta HTTP consistente.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Datos inválidos",
      detalles: err.flatten(),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error("[ERROR NO CONTROLADO]", err);
  return res.status(500).json({ error: "Error interno del servidor" });
}

/**
 * Envuelve un handler async para que sus errores lleguen automáticamente
 * al errorHandler, sin necesidad de try/catch repetido en cada controller.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
