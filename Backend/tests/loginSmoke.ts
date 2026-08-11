import dotenv from "dotenv";
import { pool } from "../src/database/db";
import { login } from "../src/services/authService";

dotenv.config();

async function run(): Promise<void> {
  const result = await login(
    { email: "sales@example.com", password: "password123" },
    { ipAddress: "127.0.0.1", userAgent: "smoke-test" }
  );

  console.log("login_ok", Boolean(result.token), result.expiresIn, result.user.role);

  const lastLoginResult = await pool.query<{ last_login_at: string | null }>(
    "SELECT last_login_at FROM users WHERE email = $1",
    ["sales@example.com"]
  );
  console.log("last_login_at_set", Boolean(lastLoginResult.rows[0]?.last_login_at));

  const loginCountResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(1)::text AS count
      FROM user_login_logs ul
      JOIN users u ON u.id = ul.user_id
      WHERE u.email = $1
    `,
    ["sales@example.com"]
  );

  console.log("login_logs_count", Number(loginCountResult.rows[0]?.count ?? "0"));

  await pool.end();
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
