// Creates the bookings table in Neon. Run: npm run db:setup
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Put it in .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const statements = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")
  .split(";")
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

for (const statement of statements) await sql.query(statement);
console.log("Database ready: bookings table created.");
