import { withTransaction } from "../database/db";
import { ApiError } from "../utils/apiError";
import type { Challan, ChallanListResponse, ChallanWithItems } from "../types/challan";
import type { ChallanCreateInput, ChallanItemInput, ChallanListQuery, ChallanUpdateInput } from "../validators/challanValidators";
import {
  createChallan,
  deleteChallanItems,
  generateChallanNumber,
  getChallanById,
  getChallanByIdWithClient,
  insertChallanItem,
  listChallans,
  lockProductsForUpdate,
  updateChallanStatus,
  updateChallanTotalQuantity
} from "../repositories/challanRepository";
import { getProductByIdWithClient, adjustStock } from "../repositories/productRepository";
import { createStockMovement } from "../repositories/stockMovementRepository";

async function resolveAndInsertItems(
  client: import("pg").PoolClient,
  challanId: number,
  items: ChallanItemInput[]
): Promise<number> {
  let totalQuantity = 0;

  for (const item of items) {
    const product = await getProductByIdWithClient(client, item.productId);
    if (!product) {
      throw new ApiError(400, `Product with ID ${item.productId} not found`);
    }

    await insertChallanItem(
      client,
      challanId,
      product.id,
      product.name,
      product.sku,
      product.unitPrice,
      item.quantity
    );

    totalQuantity += item.quantity;
  }

  return totalQuantity;
}

export async function listChallanService(query: ChallanListQuery): Promise<ChallanListResponse> {
  return listChallans(query);
}

export async function getChallanService(id: number): Promise<ChallanWithItems> {
  const challan = await getChallanById(id);
  if (!challan) {
    throw new ApiError(404, "Challan not found");
  }

  return challan;
}

export async function createChallanService(input: ChallanCreateInput, createdBy: number): Promise<ChallanWithItems> {
  return withTransaction(async (client) => {
    const challanNumber = await generateChallanNumber();

    const challan = await createChallan(client, challanNumber, input.customerId, 0, createdBy);

    const totalQuantity = await resolveAndInsertItems(client, challan.id, input.items);

    await updateChallanTotalQuantity(client, challan.id, totalQuantity);

    const result = await getChallanByIdWithClient(client, challan.id);
    if (!result) {
      throw new Error("Failed to fetch created challan");
    }

    return { ...result, totalQuantity };
  });
}

export async function updateChallanService(id: number, input: ChallanUpdateInput): Promise<ChallanWithItems> {
  return withTransaction(async (client) => {
    const challan = await getChallanByIdWithClient(client, id);
    if (!challan) {
      throw new ApiError(404, "Challan not found");
    }

    if (challan.status !== "DRAFT") {
      throw new ApiError(409, "Only DRAFT challans can be updated");
    }

    await deleteChallanItems(client, id);

    const totalQuantity = await resolveAndInsertItems(client, id, input.items);

    await updateChallanTotalQuantity(client, id, totalQuantity);

    const result = await getChallanByIdWithClient(client, id);
    if (!result) {
      throw new Error("Failed to fetch updated challan");
    }

    return { ...result, totalQuantity };
  });
}

/**
 * THE CRITICAL TRANSACTION — Confirm Sale
 *
 * Steps (all atomic inside one DB transaction):
 *   ⑤ CHECK STOCK   — SELECT ... FOR UPDATE, validate availability
 *   ⑥ CONFIRM SALE  — UPDATE challan status → CONFIRMED
 *   ⑦ REDUCE STOCK  — UPDATE products SET current_stock -= quantity
 *   ⑧ RECORD MOVEMENT — INSERT INTO stock_movements (type=OUT)
 */
export async function confirmChallanService(id: number, userId: number): Promise<ChallanWithItems> {
  return withTransaction(async (client) => {
    // Fetch challan with FOR UPDATE lock
    const challan = await getChallanByIdWithClient(client, id);
    if (!challan) {
      throw new ApiError(404, "Challan not found");
    }

    if (challan.status !== "DRAFT") {
      throw new ApiError(409, `Challan is already ${challan.status.toLowerCase()}`);
    }

    if (challan.items.length === 0) {
      throw new ApiError(409, "Cannot confirm a challan with no items");
    }

    // ⑤ CHECK STOCK — lock product rows and validate availability
    const productIds = challan.items.map((item) => item.productId);
    const lockedProducts = await lockProductsForUpdate(client, productIds);

    const stockMap = new Map(lockedProducts.map((p) => [p.id, p]));

    for (const item of challan.items) {
      const product = stockMap.get(item.productId);
      if (!product) {
        throw new ApiError(400, `Product ${item.productName} (ID: ${item.productId}) no longer exists`);
      }

      if (product.currentStock < item.quantity) {
        throw new ApiError(
          409,
          `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Required: ${item.quantity}`
        );
      }
    }

    // ⑥ CONFIRM SALE
    await updateChallanStatus(client, id, "CONFIRMED");

    // ⑦ REDUCE STOCK + ⑧ RECORD STOCK MOVEMENT
    for (const item of challan.items) {
      await adjustStock(client, item.productId, -item.quantity);

      await createStockMovement(
        client,
        item.productId,
        item.quantity,
        "OUT",
        `Challan ${challan.challanNumber}`,
        userId
      );
    }

    // Return the confirmed challan
    const confirmed = await getChallanByIdWithClient(client, id);
    if (!confirmed) {
      throw new Error("Failed to fetch confirmed challan");
    }

    return confirmed;
  });
}

export async function cancelChallanService(id: number): Promise<ChallanWithItems> {
  return withTransaction(async (client) => {
    const challan = await getChallanByIdWithClient(client, id);
    if (!challan) {
      throw new ApiError(404, "Challan not found");
    }

    if (challan.status === "CANCELLED") {
      throw new ApiError(409, "Challan is already cancelled");
    }

    if (challan.status === "CONFIRMED") {
      throw new ApiError(409, "Cannot cancel a confirmed challan");
    }

    await updateChallanStatus(client, id, "CANCELLED");

    const cancelled = await getChallanByIdWithClient(client, id);
    if (!cancelled) {
      throw new Error("Failed to fetch cancelled challan");
    }

    return cancelled;
  });
}
