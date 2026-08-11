import type { MovementType } from "./domain";

export type StockMovement = {
  id: number;
  productId: number;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdBy: number;
  createdAt: string;
};
