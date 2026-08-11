import type { PoolClient } from "pg";
import { pool } from "../database/db";
import type { Product, ProductListResponse } from "../types/product";
import type { ProductCreateInput, ProductListQuery, ProductUpdateInput } from "../validators/productValidators";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: string;
  current_stock: string;
  minimum_stock: string;
  warehouse_location: string;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapProductRow(row: ProductRow): Product {
  return {
    id: Number(row.id),
    name: row.name,
    sku: row.sku,
    category: row.category,
    unitPrice: row.unit_price,
    currentStock: Number(row.current_stock),
    minimumStock: Number(row.minimum_stock),
    warehouseLocation: row.warehouse_location,
    imageUrl: row.image_url ?? null,
    createdBy: row.created_by ? Number(row.created_by) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toProductListResponse(items: Product[], total: number, page: number, limit: number): ProductListResponse {
  return {
    items,
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
}

const SELECT_COLUMNS = "id, name, sku, category, unit_price, current_stock, minimum_stock, warehouse_location, image_url, created_by, created_at, updated_at";

export async function listProducts(query: ProductListQuery): Promise<ProductListResponse> {
  const searchValue = query.search ? `%${query.search}%` : null;
  const categoryValue = normalizeOptionalString(query.category);
  const offset = (query.page - 1) * query.limit;

  const countResult = await pool.query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM products
      WHERE ($1::text IS NULL OR name ILIKE $1 OR sku ILIKE $1)
        AND ($2::text IS NULL OR category = $2)
        AND ($3::boolean IS NULL OR current_stock <= minimum_stock)
    `,
    [searchValue, categoryValue, query.lowStock ?? null]
  );

  const total = Number(countResult.rows[0]?.total ?? 0);

  const dataResult = await pool.query<ProductRow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM products
      WHERE ($1::text IS NULL OR name ILIKE $1 OR sku ILIKE $1)
        AND ($2::text IS NULL OR category = $2)
        AND ($3::boolean IS NULL OR current_stock <= minimum_stock)
      ORDER BY created_at DESC, id DESC
      LIMIT $4 OFFSET $5
    `,
    [searchValue, categoryValue, query.lowStock ?? null, query.limit, offset]
  );

  return toProductListResponse(dataResult.rows.map(mapProductRow), total, query.page, query.limit);
}

export async function getProductById(id: number): Promise<Product | null> {
  const result = await pool.query<ProductRow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM products
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  const row = result.rows[0];
  return row ? mapProductRow(row) : null;
}

export async function getProductByIdWithClient(client: PoolClient, id: number): Promise<Product | null> {
  const result = await client.query<ProductRow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM products
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  const row = result.rows[0];
  return row ? mapProductRow(row) : null;
}

export async function createProduct(input: ProductCreateInput, createdBy: number | null): Promise<Product> {
  const result = await pool.query<ProductRow>(
    `
      INSERT INTO products (name, sku, category, unit_price, current_stock, minimum_stock, warehouse_location, image_url, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${SELECT_COLUMNS}
    `,
    [
      input.name,
      input.sku,
      input.category,
      input.unitPrice,
      input.currentStock,
      input.minimumStock,
      input.warehouseLocation,
      input.imageUrl ?? null,
      createdBy
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Product insert did not return a row");
  }

  return mapProductRow(row);
}

export async function updateProduct(id: number, input: ProductUpdateInput): Promise<Product | null> {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  let parameterIndex = 1;

  const addField = (column: string, value: string | number | null | undefined): void => {
    if (value === undefined) {
      return;
    }

    fields.push(`${column} = $${parameterIndex}`);
    values.push(value);
    parameterIndex += 1;
  };

  addField("name", input.name);
  addField("sku", input.sku);
  addField("category", input.category);
  addField("unit_price", input.unitPrice);
  addField("current_stock", input.currentStock);
  addField("minimum_stock", input.minimumStock);
  addField("warehouse_location", input.warehouseLocation);
  addField("image_url", input.imageUrl);

  if (fields.length === 0) {
    return getProductById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<ProductRow>(
    `
      UPDATE products
      SET ${fields.join(", ")}
      WHERE id = $${parameterIndex}
      RETURNING ${SELECT_COLUMNS}
    `,
    values
  );

  const row = result.rows[0];
  return row ? mapProductRow(row) : null;
}

export async function adjustStock(
  client: PoolClient,
  productId: number,
  quantityDelta: number
): Promise<void> {
  await client.query(
    `
      UPDATE products
      SET current_stock = current_stock + $1,
          updated_at = NOW()
      WHERE id = $2
    `,
    [quantityDelta, productId]
  );
}
