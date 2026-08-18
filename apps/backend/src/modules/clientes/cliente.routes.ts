import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as clienteController from "./cliente.controller";

const router = Router();

router.use(requireAuth);

router.get("/", clienteController.listarHandler);
router.get("/:id", clienteController.obtenerHandler);
router.get("/:id/cuenta", clienteController.obtenerCuentaHandler);
router.post("/", requireRole("ADMIN"), clienteController.crearHandler);
router.patch("/:id", requireRole("ADMIN"), clienteController.actualizarHandler);
router.post("/:id/abonos", requireRole("ADMIN"), clienteController.registrarAbonoHandler);
router.delete("/:id", requireRole("ADMIN"), clienteController.eliminarHandler);

export default router;
