import "dotenv/config";

/**
 * Punto único de acceso a variables de entorno.
 * Si falta una variable requerida, el servidor falla al arrancar
 * en vez de fallar silenciosamente más adelante.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  // Acepta una lista separada por comas (ej. "http://localhost:5173,http://localhost:4173")
  // para que tanto el modo desarrollo (5173) como el preview de producción (4173)
  // puedan conectarse sin tener que editar el .env cada vez que cambias de uno a otro.
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:4173")
    .split(",")
    .map((o) => o.trim()),
};
