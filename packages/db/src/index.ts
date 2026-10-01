import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or POSTGRES_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = new URL(connectionString);
dbUrl.searchParams.delete("sslmode");

export const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl: {
    rejectUnauthorized: false,
  },
});
export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
