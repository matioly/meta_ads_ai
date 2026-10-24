require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./db");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Impede duas execucoes simultaneas das migrations.
    await client.query("SELECT pg_advisory_xact_lock(7241901)");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const directory = path.join(__dirname, "migrations");

    const files = (await fs.readdir(directory))
      .filter((file) => /^\d+_[a-zA-Z0-9_-]+\.sql$/.test(file))
      .sort();

    for (const file of files) {
      const existing = await client.query(
        "SELECT name FROM schema_migrations WHERE name = $1",
        [file]
      );

      if (existing.rowCount > 0) {
        console.log(`Ja aplicada: ${file}`);
        continue;
      }

      const sql = await fs.readFile(
        path.join(directory, file),
        "utf8"
      );

      await client.query(sql);

      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file]
      );

      console.log(`Aplicada: ${file}`);
    }

    await client.query("COMMIT");
    console.log("Migrations concluidas.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await migrate();
  } catch (error) {
    console.error(
      "Falha nas migrations. Codigo:",
      error.code || "MIGRATION_ERROR"
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();