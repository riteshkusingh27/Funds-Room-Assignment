import { Router } from "express";
import {
  cancelChallan,
  confirmChallan,
  createChallan,
  getChallan,
  listChallans,
  updateChallan
} from "../controllers/challanController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { asyncHandler } from "../utils/asyncHandler";

const challanRouter = Router();

challanRouter.use(authenticate);

challanRouter.get("/", authorize(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]), asyncHandler(listChallans));
challanRouter.post("/", authorize(["ADMIN", "SALES"]), asyncHandler(createChallan));
challanRouter.get("/:challanId", authorize(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]), asyncHandler(getChallan));
challanRouter.put("/:challanId", authorize(["ADMIN", "SALES"]), asyncHandler(updateChallan));
challanRouter.post("/:challanId/confirm", authorize(["ADMIN", "SALES", "WAREHOUSE"]), asyncHandler(confirmChallan));
challanRouter.post("/:challanId/cancel", authorize(["ADMIN"]), asyncHandler(cancelChallan));

export default challanRouter;
