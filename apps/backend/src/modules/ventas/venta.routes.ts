import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as ventaController from "./venta.controller";

const router = Router();

router.use(requireAuth);

router.get("/", ventaController.listarHandler);
router.get("/:id/ticket", ventaController.obtenerTicketHandler);
router.delete("/:id", ventaController.anularHandler);
router.patch("/:id/metodo-pago", ventaController.cambiarMetodoPagoHandler);

export default router;
