import express from "express";
import cors from "cors";
import http from "http";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { initSocket } from "./sockets/socketServer";
import authRoutes from "./modules/auth/auth.routes";
import productoRoutes from "./modules/productos/producto.routes";
import ingredienteRoutes from "./modules/ingredientes/ingrediente.routes";
import recetaRoutes from "./modules/recetas/receta.routes";
import inventarioRoutes from "./modules/inventario/inventario.routes";
import espacioRoutes from "./modules/espacios/espacio.routes";
import pedidoRoutes from "./modules/pedidos/pedido.routes";
import cajaRoutes from "./modules/caja/caja.routes";
import compraRoutes from "./modules/compras/compra.routes";
import ventaRoutes from "./modules/ventas/venta.routes";

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

// Health check simple para confirmar que el servidor está vivo
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rutas por módulo. Cada módulo nuevo se registra aquí.
app.use("/api/auth", authRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/productos/:productoId/receta", recetaRoutes);
app.use("/api/ingredientes", ingredienteRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/espacios", espacioRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/compras", compraRoutes);
app.use("/api/ventas", ventaRoutes);

// El error handler siempre va después de todas las rutas.
app.use(errorHandler);

const httpServer = http.createServer(app);

// Inicializa Socket.IO. Cualquier service (ej. pedido.service) puede emitir
// eventos en tiempo real importando getIO() desde ./sockets/socketServer.
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`🎸 Barranke POS backend corriendo en http://localhost:${env.port}`);
});
