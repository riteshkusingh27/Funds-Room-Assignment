import { Router } from "express";
import { login, me, roleCheck } from "../controllers/authController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { asyncHandler } from "../utils/asyncHandler";

const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.get("/me", authenticate, asyncHandler(me));

authRouter.get("/role/admin", authenticate, authorize(["ADMIN"]), asyncHandler(roleCheck));
authRouter.get("/role/sales", authenticate, authorize(["SALES", "ADMIN"]), asyncHandler(roleCheck));
authRouter.get("/role/warehouse", authenticate, authorize(["WAREHOUSE", "ADMIN"]), asyncHandler(roleCheck));
authRouter.get("/role/accounts", authenticate, authorize(["ACCOUNTS", "ADMIN"]), asyncHandler(roleCheck));

export default authRouter;
