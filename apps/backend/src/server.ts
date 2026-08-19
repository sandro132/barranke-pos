import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { initSocket } from "./sockets/socketServer";
import authRoutes from "./modules/auth/auth.routes";
import productoRoutes from "./modules/productos/producto.routes";
import ingredienteRoutes from "./modules/ingredientes/ingrediente.routes";
import recetaRoutes from "./modules/recetas/receta.routes";
import inventarioRoutes from "./modules/inventario/inventario.routes";
import espacioRoutes from "./modules/espacios/espacio.routes";
import cuentaRoutes from "./modules/cuentas/cuenta.routes";
import pedidoRoutes from "./modules/pedidos/pedido.routes";
import cajaRoutes from "./modules/caja/caja.routes";
import compraRoutes from "./modules/compras/compra.routes";
import ventaRoutes from "./modules/ventas/venta.routes";
import reporteRoutes from "./modules/reportes/reporte.routes";
import promocionRoutes from "./modules/promociones/promocion.routes";
import clienteRoutes from "./modules/clientes/cliente.routes";
import categoriaRoutes from "./modules/categorias/categoria.routes";
import consumoInternoRoutes from "./modules/consumo-interno/consumo-interno.routes";
import proveedorRoutes from "./modules/proveedores/proveedor.routes";
import usuarioRoutes from "./modules/usuarios/usuario.routes";
import gastoRoutes from "./modules/gastos/gasto.routes";

const app = express();

app.use(cors({ origin: env.corsOrigins, credentials: true }));
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
app.use("/api/cuentas", cuentaRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/compras", compraRoutes);
app.use("/api/ventas", ventaRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/promociones", promocionRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/consumo-interno", consumoInternoRoutes);
app.use("/api/proveedores", proveedorRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/gastos", gastoRoutes);

/**
 * Sirve el frontend ya compilado (resultado de `npm run build` en
 * apps/frontend) desde este mismo servidor y puerto. Así, cualquier
 * dispositivo en la misma red WiFi del bar (el celular de un mesero, otro
 * computador) puede usar la app entrando a http://<ip-de-esta-pc>:4000 —
 * no hace falta correr el frontend por separado, ni pelear con CORS entre
 * dos puertos distintos, porque todo es el mismo origen.
 *
 * Si esta carpeta no existe (nunca se corrió el build del frontend), esta
 * parte simplemente no encuentra archivos y el catch-all de abajo devuelve
 * 404 — el resto de la API sigue funcionando normal.
 */
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDistPath));

// Cualquier ruta que NO sea /api/* ni /health devuelve el index.html del
// frontend, para que las rutas internas de React Router (ej. /mesas/123)
// funcionen bien incluso si alguien recarga la página estando ahí.
app.get(/^(?!\/api|\/health).*/, (_req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// El error handler siempre va después de todas las rutas.
app.use(errorHandler);

const httpServer = http.createServer(app);

// Inicializa Socket.IO. Cualquier service (ej. pedido.service) puede emitir
// eventos en tiempo real importando getIO() desde ./sockets/socketServer.
initSocket(httpServer);

// "0.0.0.0" (en vez de dejarlo por defecto) para asegurar que escuche en
// TODAS las interfaces de red, no solo en localhost — así otros
// dispositivos de la misma red pueden conectarse por la IP de esta PC.
httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`🎸 Barranke POS backend corriendo en http://localhost:${env.port}`);
  console.log(`   (y también accesible desde otros dispositivos de tu red WiFi por la IP de esta PC)`);
});
