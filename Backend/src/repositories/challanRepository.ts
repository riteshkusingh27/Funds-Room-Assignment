import type { PoolClient } from "pg";
import { pool } from "../database/db";
import type { Challan, ChallanItem, ChallanListResponse, ChallanWithItems } from "../types/challan";
import type { ChallanStatus } from "../types/domain";
import type { ChallanListQuery } from "../validators/challanValidators";

type ChallanRow = {
  id: string;
  challan_number: string;
  customer_id: string;
  total_quantity: string;
  status: ChallanStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ChallanItemRow = {
  id: string;
  challan_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_price: string;
  quantity: string;
  created_at: string;
};

function mapChallanRow(row: ChallanRow): Challan {
  return {
    id: Number(row.id),
    challanNumber: row.challan_number,
    customerId: Number(row.customer_id),
    totalQuantity: Number(row.total_quantity),
    status: row.status,
    createdBy: Number(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapChallanItemRow(row: ChallanItemRow): ChallanItem {
  return {
    id: Number(row.id),
    challanId: Number(row.challan_id),
    productId: Number(row.product_id),
    productName: row.product_name,
    sku: row.sku,
    unitPrice: row.unit_price,
    quantity: Number(row.quantity),
    createdAt: row.created_at
  };
}

const CHALLAN_COLUMNS = "id, challan_number, customer_id, total_quantity, status, created_by, created_at, updated_at";
const ITEM_COLUMNS = "id, challan_id, product_id, product_name, sku, unit_price, quantity, created_at";

export async function generateChallanNumber(): Promise<string> {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM challans WHERE challan_number LIKE $1`,
    [`CH-${dateStr}-%`]
  );

  const seq = Number(result.rows[0]?.count ?? 0) + 1;
  return `CH-${dateStr}-${String(seq).padStart(3, "0")}`;
}

export async function listChallans(query: ChallanListQuery): Promise<ChallanListResponse> {
  const searchValue = query.search ? `%${query.search}%` : null;
  const offset = (query.page - 1) * query.limit;

  const countResult = await pool.query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM challans
      WHERE ($1::text IS NULL OR challan_number ILIKE $1)
        AND ($2::challan_status IS NULL OR status = $2)
        AND ($3::bigint IS NULL OR customer_id = $3)
    `,
    [searchValue, query.status ?? null, query.customerId ?? null]
  );

  const total = Number(countResult.rows[0]?.total ?? 0);

  const dataResult = await pool.query<ChallanRow>(
    `
      SELECT ${CHALLAN_COLUMNS}
      FROM challans
      WHERE ($1::text IS NULL OR challan_number ILIKE $1)
        AND ($2::challan_status IS NULL OR status = $2)
        AND ($3::bigint IS NULL OR customer_id = $3)
      ORDER BY created_at DESC, id DESC
      LIMIT $4 OFFSET $5
    `,
    [searchValue, query.status ?? null, query.customerId ?? null, query.limit, offset]
  );

  return {
    items: dataResult.rows.map(mapChallanRow),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
  };
}

export async function getChallanById(id: number): Promise<ChallanWithItems | null> {
  const challanResult = await pool.query<ChallanRow>(
    `SELECT ${CHALLAN_COLUMNS} FROM challans WHERE id = $1 LIMIT 1`,
    [id]
  );

  const challanRow = challanResult.rows[0];
  if (!challanRow) {
    return null;
  }

  const itemsResult = await pool.query<ChallanItemRow>(
    `SELECT ${ITEM_COLUMNS} FROM challan_items WHERE challan_id = $1 ORDER BY id ASC`,
    [id]
  );

  return {
    ...mapChallanRow(challanRow),
    items: itemsResult.rows.map(mapChallanItemRow)
  };
}

export async function getChallanByIdWithClient(client: PoolClient, id: number): Promise<ChallanWithItems | null> {
  const challanResult = await client.query<ChallanRow>(
    `SELECT ${CHALLAN_COLUMNS} FROM challans WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [id]
  );

  const challanRow = challanResult.rows[0];
  if (!challanRow) {
    return null;
  }

  const itemsResult = await client.query<ChallanItemRow>(
    `SELECT ${ITEM_COLUMNS} FROM challan_items WHERE challan_id = $1 ORDER BY id ASC`,
    [id]
  );

  return {
    ...mapChallanRow(challanRow),
    items: itemsResult.rows.map(mapChallanItemRow)
  };
}

export async function createChallan(
  client: PoolClient,
  challanNumber: string,
  customerId: number,
  totalQuantity: number,
  createdBy: number
): Promise<Challan> {
  const result = await client.query<ChallanRow>(
    `
      INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by)
      VALUES ($1, $2, $3, 'DRAFT'::challan_status, $4)
      RETURNING ${CHALLAN_COLUMNS}
    `,
    [challanNumber, customerId, totalQuantity, createdBy]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Challan insert did not return a row");
  }

  return mapChallanRow(row);
}

export async function insertChallanItem(
  client: PoolClient,
  challanId: number,
  productId: number,
  productName: string,
  sku: string,
  unitPrice: string,
  quantity: number
): Promise<ChallanItem> {
  const result = await client.query<ChallanItemRow>(
    `
      INSERT INTO challan_items (challan_id, product_id, product_name, sku, unit_price, quantity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${ITEM_COLUMNS}
    `,
    [challanId, productId, productName, sku, unitPrice, quantity]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Challan item insert did not return a row");
  }

  return mapChallanItemRow(row);
}

export async function deleteChallanItems(client: PoolClient, challanId: number): Promise<void> {
  await client.query(`DELETE FROM challan_items WHERE challan_id = $1`, [challanId]);
}

export async function updateChallanTotalQuantity(
  client: PoolClient,
  challanId: number,
  totalQuantity: number
): Promise<void> {
  await client.query(
    `UPDATE challans SET total_quantity = $1, updated_at = NOW() WHERE id = $2`,
    [totalQuantity, challanId]
  );
}

export async function updateChallanStatus(
  client: PoolClient,
  challanId: number,
  status: ChallanStatus
): Promise<void> {
  await client.query(
    `UPDATE challans SET status = $1::challan_status, updated_at = NOW() WHERE id = $2`,
    [status, challanId]
  );
}

export async function lockProductsForUpdate(
  client: PoolClient,
  productIds: number[]
): Promise<{ id: number; currentStock: number; name: string }[]> {
  const result = await client.query<{ id: string; current_stock: string; name: string }>(
    `
      SELECT id, current_stock, name
      FROM products
      WHERE id = ANY($1::bigint[])
      FOR UPDATE
    `,
    [productIds]
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    currentStock: Number(row.current_stock),
    name: row.name
  }));
}
