import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH || "./data/receipts.db";

const client = createClient({
  url: `file:${DB_PATH}`,
});

// Enable foreign key constraints
client.execute("PRAGMA foreign_keys = ON;");

export const db = drizzle(client, { schema });

export * from "./schema";
