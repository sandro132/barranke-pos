import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as inventarioController from "./inventario.controller";

const router = Router();

router.use(requireAuth);

router.get("/movimientos", inventarioController.listarMovimientosHandler);
// Endpoint temporal para probar el descuento automático antes de que exista
// el módulo de Pedidos (Fase 3). Simula el efecto de vender un producto.
router.post("/simular-venta", inventarioController.simularVentaHandler);

export default router;
