import { Router } from "express";
import healthRouter from "./health.js";
import simulationsRouter from "./simulations.js";
import workspaceRouter from "./workspace.js";

const router = Router();

router.use(healthRouter);
router.use(simulationsRouter);
router.use(workspaceRouter);

export default router;
