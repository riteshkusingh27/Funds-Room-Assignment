import { Router } from "express";
import {
  createCustomer,
  createCustomerFollowup,
  getCustomer,
  listCustomerFollowups,
  listCustomers,
  updateCustomer
} from "../controllers/customerController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { asyncHandler } from "../utils/asyncHandler";

const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get("/", authorize(["ADMIN", "SALES", "ACCOUNTS"]), asyncHandler(listCustomers));
customerRouter.post("/", authorize(["ADMIN", "SALES"]), asyncHandler(createCustomer));
customerRouter.get("/:customerId", authorize(["ADMIN", "SALES", "ACCOUNTS"]), asyncHandler(getCustomer));
customerRouter.put("/:customerId", authorize(["ADMIN", "SALES"]), asyncHandler(updateCustomer));
customerRouter.get("/:customerId/followups", authorize(["ADMIN", "SALES", "ACCOUNTS"]), asyncHandler(listCustomerFollowups));
customerRouter.post("/:customerId/followups", authorize(["ADMIN", "SALES"]), asyncHandler(createCustomerFollowup));

export default customerRouter;
