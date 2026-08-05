import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as reporteController from "./reporte.controller";

const router = Router();

router.use(requireAuth);

router.get("/ventas", reporteController.ventasHandler);
router.get("/productos", reporteController.productosHandler);
router.get("/ganancias", reporteController.gananciasHandler);
router.get("/metodos-pago", reporteController.metodosPagoHandler);
router.get("/categorias", reporteController.categoriasHandler);
router.get("/inventario", reporteController.inventarioHandler);
router.get("/consumo-interno", reporteController.consumoInternoHandler);

export default router;
