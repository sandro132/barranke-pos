import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as reporteController from "./reporte.controller";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/ventas", reporteController.ventasHandler);
router.get("/productos", reporteController.productosHandler);
router.get("/ganancias", reporteController.gananciasHandler);
router.get("/metodos-pago", reporteController.metodosPagoHandler);
router.get("/categorias", reporteController.categoriasHandler);
router.get("/inventario", reporteController.inventarioHandler);
router.get("/consumo-interno", reporteController.consumoInternoHandler);
router.get("/compras", reporteController.comprasHandler);
router.get("/excel", reporteController.excelHandler);
router.get("/inventario/excel", reporteController.excelInventarioHandler);

export default router;
