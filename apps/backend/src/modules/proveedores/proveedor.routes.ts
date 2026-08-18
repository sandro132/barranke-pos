import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as proveedorController from "./proveedor.controller";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", proveedorController.listarHandler);
router.post("/", proveedorController.crearHandler);
router.patch("/:id", proveedorController.actualizarHandler);
router.delete("/:id", proveedorController.eliminarHandler);

export default router;
