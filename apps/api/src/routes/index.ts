import { Router } from "express";
import healthRouter from "./health";
import simulationsRouter from "./simulations";

const router = Router();

router.use(healthRouter);
router.use(simulationsRouter);

export default router;
