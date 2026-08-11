import { Router } from "express";
import authRouter from "./authRoutes";
import challanRouter from "./challanRoutes";
import customerRouter from "./customerRoutes";
import productRouter from "./productRoutes";

const router = Router();

router.use("/auth", authRouter);
router.use("/customers", customerRouter);
router.use("/products", productRouter);
router.use("/challans", challanRouter);

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
