import { Router } from "express";
import healthRouter from "./health.js";
import simulationsRouter from "./simulations.js";

const router = Router();

router.use(healthRouter);
router.use(simulationsRouter);

export default router;
