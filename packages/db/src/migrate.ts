import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  await migrate(drizzle(sql), {
    migrationsFolder: new URL("../migrations", import.meta.url).pathname,
  });
  console.log("migrations applied");
  await sql.end();
} catch (error) {
  console.error("migration failed:", error);
  await sql.end({ timeout: 5 });
  process.exit(1);
}
