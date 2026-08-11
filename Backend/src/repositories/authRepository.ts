import type { PoolClient } from "pg";
import { pool, withTransaction } from "../database/db";
import type { AuthUser } from "../types/auth";

export type UserWithPassword = AuthUser & {
  passwordHash: string;
};

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    role: AuthUser["role"];
    password_hash: string;
  }>(
    `
      SELECT id, name, email, role, password_hash
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash
  };
}

async function stampLogin(client: PoolClient, userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await client.query(
    `
      UPDATE users
      SET last_login_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId]
  );

  await client.query(
    `
      INSERT INTO user_login_logs (user_id, ip_address, user_agent)
      VALUES ($1, $2, $3)
    `,
    [userId, ipAddress ?? null, userAgent ?? null]
  );
}

export async function recordSuccessfulLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await withTransaction(async (client) => {
    await stampLogin(client, userId, ipAddress, userAgent);
  });
}
