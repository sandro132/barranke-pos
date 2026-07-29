import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import productoRoutes from "./modules/productos/producto.routes";
import ingredienteRoutes from "./modules/ingredientes/ingrediente.routes";
import recetaRoutes from "./modules/recetas/receta.routes";
import inventarioRoutes from "./modules/inventario/inventario.routes";

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

// Health check simple para confirmar que el servidor está vivo
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rutas por módulo. Cada módulo nuevo (mesas, pedidos...) se registra aquí.
app.use("/api/auth", authRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/productos/:productoId/receta", recetaRoutes);
app.use("/api/ingredientes", ingredienteRoutes);
app.use("/api/inventario", inventarioRoutes);

// El error handler siempre va después de todas las rutas.
app.use(errorHandler);

const httpServer = http.createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: { origin: env.corsOrigin, credentials: true },
});

io.on("connection", (socket) => {
  console.log(`[socket] cliente conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`[socket] cliente desconectado: ${socket.id}`);
  });
});

httpServer.listen(env.port, () => {
  console.log(`🎸 Barranke POS backend corriendo en http://localhost:${env.port}`);
});
