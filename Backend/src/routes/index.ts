import { Router } from "express";
import authRouter from "./authRoutes";
import customerRouter from "./customerRoutes";

const router = Router();

router.use("/auth", authRouter);
router.use("/customers", customerRouter);

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
