import bcrypt from "bcryptjs";
import { pool, withTransaction } from "../db";

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
};

function getSeedUsers(): SeedUser[] {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "password123";

  return [
    {
      name: process.env.SEED_ADMIN_NAME ?? "Admin User",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASSWORD ?? defaultPassword,
      role: "ADMIN"
    },
    {
      name: process.env.SEED_SALES_NAME ?? "Sales User",
      email: process.env.SEED_SALES_EMAIL ?? "sales@example.com",
      password: process.env.SEED_SALES_PASSWORD ?? defaultPassword,
      role: "SALES"
    },
    {
      name: process.env.SEED_WAREHOUSE_NAME ?? "Warehouse User",
      email: process.env.SEED_WAREHOUSE_EMAIL ?? "warehouse@example.com",
      password: process.env.SEED_WAREHOUSE_PASSWORD ?? defaultPassword,
      role: "WAREHOUSE"
    },
    {
      name: process.env.SEED_ACCOUNTS_NAME ?? "Accounts User",
      email: process.env.SEED_ACCOUNTS_EMAIL ?? "accounts@example.com",
      password: process.env.SEED_ACCOUNTS_PASSWORD ?? defaultPassword,
      role: "ACCOUNTS"
    }
  ];
}

async function run(): Promise<void> {
  const seedUsers = getSeedUsers();

  await withTransaction(async (client) => {
    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      await client.query(
        `
          INSERT INTO users (name, email, password_hash, role)
          VALUES ($1, $2, $3, $4::user_role)
          ON CONFLICT (email)
          DO UPDATE SET
            name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            updated_at = NOW();
        `,
        [user.name, user.email, passwordHash, user.role]
      );
    }
  });

  console.log("Seeded users for all roles");
}

run()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
