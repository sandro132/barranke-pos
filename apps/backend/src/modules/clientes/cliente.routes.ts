import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as clienteController from "./cliente.controller";

const router = Router();

router.use(requireAuth);

router.get("/", clienteController.listarHandler);
router.get("/:id", clienteController.obtenerHandler);
router.post("/", clienteController.crearHandler);
router.patch("/:id", clienteController.actualizarHandler);
router.get("/:id/cuenta", clienteController.obtenerCuentaHandler);
router.post("/:id/abonos", clienteController.registrarAbonoHandler);
router.delete("/:id", clienteController.eliminarHandler);

export default router;
