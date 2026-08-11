import { Router } from "express";
import {
  createProduct,
  createStockMovement,
  getProduct,
  listProductMovements,
  listProducts,
  proxyProductImage,
  updateProduct,
  uploadProductImage
} from "../controllers/productController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { asyncHandler } from "../utils/asyncHandler";

const productRouter = Router();

// Public image proxy for <img> rendering
productRouter.get("/image-proxy", asyncHandler(proxyProductImage));

productRouter.use(authenticate);

productRouter.get("/", authorize(["ADMIN", "SALES", "WAREHOUSE"]), asyncHandler(listProducts));
productRouter.post("/", authorize(["ADMIN", "WAREHOUSE"]), asyncHandler(createProduct));
productRouter.post("/upload-image", authorize(["ADMIN", "WAREHOUSE"]), asyncHandler(uploadProductImage));
productRouter.get("/:productId", authorize(["ADMIN", "SALES", "WAREHOUSE"]), asyncHandler(getProduct));
productRouter.put("/:productId", authorize(["ADMIN", "WAREHOUSE"]), asyncHandler(updateProduct));
productRouter.get("/:productId/movements", authorize(["ADMIN", "WAREHOUSE"]), asyncHandler(listProductMovements));
productRouter.post("/stock-movements", authorize(["ADMIN", "WAREHOUSE"]), asyncHandler(createStockMovement));

export default productRouter;
