import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as ventaController from "./venta.controller";

const router = Router();

router.use(requireAuth);

// El ticket lo puede ver cualquiera con sesión (ej. un mesero reimprimiendo
// el recibo de una cuenta que acaba de cerrar). Todo lo demás — listar
// todas las ventas, anular, corregir método, dividir — es solo Admin.
router.get("/:id/ticket", ventaController.obtenerTicketHandler);
router.get("/", requireRole("ADMIN"), ventaController.listarHandler);
router.delete("/:id", requireRole("ADMIN"), ventaController.anularHandler);
router.patch("/:id/metodo-pago", requireRole("ADMIN"), ventaController.cambiarMetodoPagoHandler);
router.post("/:id/dividir", requireRole("ADMIN"), ventaController.dividirPagoHandler);

export default router;
