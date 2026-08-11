import type { PoolClient } from "pg";
import { pool } from "../database/db";
import type { StockMovement } from "../types/stockMovement";
import type { MovementType } from "../types/domain";

type StockMovementRow = {
  id: string;
  product_id: string;
  quantity: string;
  movement_type: MovementType;
  reason: string;
  created_by: string;
  created_at: string;
};

function mapMovementRow(row: StockMovementRow): StockMovement {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    quantity: Number(row.quantity),
    movementType: row.movement_type,
    reason: row.reason,
    createdBy: Number(row.created_by),
    createdAt: row.created_at
  };
}

const SELECT_COLUMNS = "id, product_id, quantity, movement_type, reason, created_by, created_at";

export async function createStockMovement(
  client: PoolClient,
  productId: number,
  quantity: number,
  movementType: MovementType,
  reason: string,
  createdBy: number
): Promise<StockMovement> {
  const result = await client.query<StockMovementRow>(
    `
      INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
      VALUES ($1, $2, $3::movement_type, $4, $5)
      RETURNING ${SELECT_COLUMNS}
    `,
    [productId, quantity, movementType, reason, createdBy]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Stock movement insert did not return a row");
  }

  return mapMovementRow(row);
}

export async function listMovementsByProduct(
  productId: number,
  page: number,
  limit: number
): Promise<{ items: StockMovement[]; total: number; page: number; limit: number; totalPages: number }> {
  const offset = (page - 1) * limit;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM stock_movements WHERE product_id = $1`,
    [productId]
  );

  const total = Number(countResult.rows[0]?.total ?? 0);

  const dataResult = await pool.query<StockMovementRow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM stock_movements
      WHERE product_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
    `,
    [productId, limit, offset]
  );

  return {
    items: dataResult.rows.map(mapMovementRow),
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
}
