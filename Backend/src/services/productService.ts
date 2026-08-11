import { withTransaction } from "../database/db";
import { ApiError } from "../utils/apiError";
import type { Product, ProductListResponse } from "../types/product";
import type { StockMovement } from "../types/stockMovement";
import type { ProductCreateInput, ProductListQuery, ProductUpdateInput } from "../validators/productValidators";
import type { StockMovementCreateInput, StockMovementListQuery } from "../validators/stockMovementValidators";
import {
  createProduct as createProductRecord,
  deleteProduct as deleteProductRecord,
  getProductById,
  getProductByIdWithClient,
  listProducts,
  updateProduct as updateProductRecord,
  adjustStock
} from "../repositories/productRepository";
import {
  createStockMovement,
  listMovementsByProduct
} from "../repositories/stockMovementRepository";

export async function listProductService(query: ProductListQuery): Promise<ProductListResponse> {
  return listProducts(query);
}

export async function getProductService(id: number): Promise<Product> {
  const product = await getProductById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
}

export async function createProductService(input: ProductCreateInput, createdBy: number): Promise<Product> {
  return createProductRecord(input, createdBy);
}

export async function updateProductService(id: number, input: ProductUpdateInput): Promise<Product> {
  const product = await updateProductRecord(id, input);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
}

export async function createStockMovementService(
  input: StockMovementCreateInput,
  createdBy: number
): Promise<StockMovement> {
  return withTransaction(async (client) => {
    const product = await getProductByIdWithClient(client, input.productId);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const delta = input.movementType === "IN" ? input.quantity : -input.quantity;

    if (input.movementType === "OUT" && product.currentStock < input.quantity) {
      throw new ApiError(409, `Insufficient stock. Available: ${product.currentStock}, Requested: ${input.quantity}`);
    }

    const movement = await createStockMovement(client, input.productId, input.quantity, input.movementType, input.reason, createdBy);
    await adjustStock(client, input.productId, delta);

    return movement;
  });
}

export async function listProductMovementsService(
  productId: number,
  query: StockMovementListQuery
): Promise<{ items: StockMovement[]; total: number; page: number; limit: number; totalPages: number }> {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return listMovementsByProduct(productId, query.page, query.limit);
}

export async function deleteProductService(id: number): Promise<void> {
  const deleted = await deleteProductRecord(id);
  if (!deleted) {
    throw new ApiError(404, "Product not found");
  }
}
