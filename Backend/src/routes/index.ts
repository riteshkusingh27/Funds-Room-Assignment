import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "backend",
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
