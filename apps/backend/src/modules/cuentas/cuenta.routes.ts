import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as cuentaController from "./cuenta.controller";

const router = Router();

router.use(requireAuth);

router.get("/", cuentaController.listarHandler);
router.get("/:id", cuentaController.obtenerHandler);
router.post("/", cuentaController.abrirHandler);
router.patch("/:id", cuentaController.actualizarHandler);
router.post("/:id/cerrar", cuentaController.cerrarHandler);
router.post("/:id/unir", cuentaController.unirHandler);
router.post("/:id/separar", cuentaController.separarHandler);
router.get("/:id/precuenta", cuentaController.precuentaHandler);

export default router;
