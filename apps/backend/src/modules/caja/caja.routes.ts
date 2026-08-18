import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as cajaController from "./caja.controller";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/actual", cajaController.obtenerActualHandler);
router.post("/abrir", cajaController.abrirHandler);
router.post("/movimientos", cajaController.registrarMovimientoHandler);
router.post("/cerrar", cajaController.cerrarHandler);
router.get("/historial", cajaController.historialHandler);
router.get("/:id", cajaController.detalleHandler);

export default router;
