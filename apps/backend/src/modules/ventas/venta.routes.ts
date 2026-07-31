import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as ventaController from "./venta.controller";

const router = Router();

router.use(requireAuth);

router.get("/:id/ticket", ventaController.obtenerTicketHandler);

export default router;
