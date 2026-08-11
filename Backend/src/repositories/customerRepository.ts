import type { PoolClient } from "pg";
import { pool } from "../database/db";
import type { Customer, CustomerFollowup, CustomerListResponse } from "../types/customer";
import type { CustomerCreateInput, CustomerFollowupInput, CustomerListQuery, CustomerUpdateInput } from "../validators/customerValidators";

type CustomerRow = {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  business_name: string;
  gst_number: string | null;
  customer_type: Customer["customerType"];
  address: string;
  status: Customer["status"];
  follow_up_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerFollowupRow = {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date: string | null;
  created_by: string;
  created_at: string;
};

function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: Number(row.id),
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    businessName: row.business_name,
    gstNumber: row.gst_number,
    customerType: row.customer_type,
    address: row.address,
    status: row.status,
    followUpDate: row.follow_up_date,
    notes: row.notes,
    createdBy: row.created_by ? Number(row.created_by) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFollowupRow(row: CustomerFollowupRow): CustomerFollowup {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    note: row.note,
    followUpDate: row.follow_up_date,
    createdBy: Number(row.created_by),
    createdAt: row.created_at
  };
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toCustomerListResponse(items: Customer[], total: number, page: number, limit: number): CustomerListResponse {
  return {
    items,
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
}

async function getCustomerByIdWithClient(client: PoolClient, id: number): Promise<Customer | null> {
  const result = await client.query<CustomerRow>(
    `
      SELECT id, name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by, created_at, updated_at
      FROM customers
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  const row = result.rows[0];
  return row ? mapCustomerRow(row) : null;
}

export async function listCustomers(query: CustomerListQuery): Promise<CustomerListResponse> {
  const searchValue = normalizeOptionalString(query.search);
  const offset = (query.page - 1) * query.limit;
  const likePattern = searchValue ? `%${searchValue}%` : null;

  const countResult = await pool.query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM customers
      WHERE ($1::text IS NULL)
        OR name ILIKE $1
        OR business_name ILIKE $1
        OR mobile ILIKE $1
        OR COALESCE(email, '') ILIKE $1
        OR COALESCE(gst_number, '') ILIKE $1
    `,
    [likePattern]
  );

  const total = Number(countResult.rows[0]?.total ?? 0);

  const dataResult = await pool.query<CustomerRow>(
    `
      SELECT id, name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by, created_at, updated_at
      FROM customers
      WHERE ($1::text IS NULL)
        OR name ILIKE $1
        OR business_name ILIKE $1
        OR mobile ILIKE $1
        OR COALESCE(email, '') ILIKE $1
        OR COALESCE(gst_number, '') ILIKE $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
    `,
    [likePattern, query.limit, offset]
  );

  return toCustomerListResponse(dataResult.rows.map(mapCustomerRow), total, query.page, query.limit);
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const result = await pool.query<CustomerRow>(
    `
      SELECT id, name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by, created_at, updated_at
      FROM customers
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  const row = result.rows[0];
  return row ? mapCustomerRow(row) : null;
}

export async function createCustomer(input: CustomerCreateInput, createdBy: number | null): Promise<Customer> {
  const result = await pool.query<CustomerRow>(
    `
      INSERT INTO customers (
        name,
        mobile,
        email,
        business_name,
        gst_number,
        customer_type,
        address,
        status,
        follow_up_date,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6::customer_type, $7, COALESCE($8::customer_status, 'Lead'), $9::date, $10, $11)
      RETURNING id, name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by, created_at, updated_at
    `,
    [
      input.name,
      input.mobile,
      normalizeOptionalString(input.email),
      input.businessName,
      normalizeOptionalString(input.gstNumber),
      input.customerType,
      input.address,
      input.status ?? null,
      input.followUpDate ?? null,
      normalizeOptionalString(input.notes),
      createdBy
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Customer insert did not return a row");
  }

  return mapCustomerRow(row);
}

export async function updateCustomer(id: number, input: CustomerUpdateInput): Promise<Customer | null> {
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
  addField("mobile", input.mobile);
  addField("email", normalizeOptionalString(input.email));
  addField("business_name", input.businessName);
  addField("gst_number", normalizeOptionalString(input.gstNumber));
  addField("customer_type", input.customerType);
  addField("address", input.address);
  addField("status", input.status);
  addField("follow_up_date", input.followUpDate ?? undefined);
  addField("notes", normalizeOptionalString(input.notes));

  if (fields.length === 0) {
    return getCustomerById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<CustomerRow>(
    `
      UPDATE customers
      SET ${fields.join(", ")}
      WHERE id = $${parameterIndex}
      RETURNING id, name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by, created_at, updated_at
    `,
    values
  );

  const row = result.rows[0];
  return row ? mapCustomerRow(row) : null;
}

export async function createCustomerFollowup(
  client: PoolClient,
  customerId: number,
  input: CustomerFollowupInput,
  createdBy: number
): Promise<CustomerFollowup> {
  const result = await client.query<CustomerFollowupRow>(
    `
      INSERT INTO customer_followups (customer_id, note, follow_up_date, created_by)
      VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4)
      RETURNING id, customer_id, note, follow_up_date, created_by, created_at
    `,
    [customerId, input.note, input.followUpDate ?? null, createdBy]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Customer follow-up insert did not return a row");
  }

  return mapFollowupRow(row);
}

export async function touchCustomerFollowup(
  client: PoolClient,
  customerId: number,
  followUpDate: string | null,
  note: string
): Promise<void> {
  await client.query(
    `
      UPDATE customers
      SET follow_up_date = COALESCE($1::date, CURRENT_DATE),
          notes = $2,
          updated_at = NOW()
      WHERE id = $3
    `,
    [followUpDate, note, customerId]
  );
}

export async function listCustomerFollowups(customerId: number): Promise<CustomerFollowup[]> {
  const result = await pool.query<CustomerFollowupRow>(
    `
      SELECT id, customer_id, note, follow_up_date, created_by, created_at
      FROM customer_followups
      WHERE customer_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [customerId]
  );

  return result.rows.map(mapFollowupRow);
}
