import { Router } from "express";
import healthRouter from "./health.js";
import simulationsRouter from "./simulations.js";
import workspaceRouter from "./workspace.js";
import retentionRouter from "./retention.js";

const router = Router();

router.use(healthRouter);
router.use(simulationsRouter);
router.use(workspaceRouter);
router.use(retentionRouter);

export default router;
