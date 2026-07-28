import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

export interface JwtPayload {
  userId: string;
  rol: string;
}

// Extiende el tipo Request de Express para incluir el usuario autenticado
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifica el header Authorization: Bearer <token>.
 * Nota: por ahora todos los roles tienen el mismo nivel de acceso (según lo pedido),
 * así que este middleware solo valida que el usuario esté autenticado.
 * Cuando se activen los roles diferenciados, aquí se agregará el chequeo de permisos.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("No autenticado", 401);
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError("Token inválido o expirado", 401);
  }
}
