import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as consumoInternoController from "./consumo-interno.controller";

const router = Router();

router.use(requireAuth);

router.get("/", consumoInternoController.listarHandler);
router.post("/", consumoInternoController.registrarHandler);

export default router;
