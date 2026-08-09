import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as proveedorController from "./proveedor.controller";

const router = Router();

router.use(requireAuth);

router.get("/", proveedorController.listarHandler);
router.post("/", proveedorController.crearHandler);
router.patch("/:id", proveedorController.actualizarHandler);
router.delete("/:id", proveedorController.eliminarHandler);

export default router;
