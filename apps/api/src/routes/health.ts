import { Router, type Request } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

router.get(
  "/healthz",
  (_req: Request, res: { json: (body: unknown) => void }): void => {
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  },
);

export default router;
