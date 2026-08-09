import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as pedidoController from "./pedido.controller";

const router = Router();

router.use(requireAuth);

router.post("/", pedidoController.crearHandler);
router.get("/cocina", pedidoController.listarCocinaHandler);
router.get("/barra", pedidoController.listarBarraHandler);
router.get("/cuenta/:cuentaId", pedidoController.listarPorCuentaHandler);
router.post("/cuenta/:cuentaId/repetir-ultima-ronda", pedidoController.repetirUltimaRondaHandler);
router.patch("/items/:itemId/estado", pedidoController.actualizarEstadoItemHandler);
router.post("/items/:itemId/cancelar", pedidoController.cancelarItemHandler);

export default router;
