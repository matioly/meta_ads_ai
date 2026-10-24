const bcrypt = require("bcryptjs");
const pool = require("./db");

async function bootstrap() {
  const existing = await pool.query("SELECT id FROM users LIMIT 1");

  if (existing.rowCount > 0) {
    console.log("Usuario inicial ja configurado.");
    return;
  }

  const name = (process.env.BOOTSTRAP_NAME || "").trim();
  const email = (process.env.BOOTSTRAP_EMAIL || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD || "";

  if (
    !name ||
    name.length > 120 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error("BOOTSTRAP_CONFIG_INVALID");
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7241902)");

    const recheck = await client.query("SELECT id FROM users LIMIT 1");

    if (recheck.rowCount === 0) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [name, email, hash]
      );

      const userId = result.rows[0].id;

      for (const companyName of [
        "Sorriso de Campinas",
        "Alps Oral Clinic"
      ]) {
        const company = await client.query(
          `INSERT INTO companies (name, city, state)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [companyName, "Campinas", "SP"]
        );

        await client.query(
          `INSERT INTO company_members (company_id, user_id, role)
           VALUES ($1, $2, 'owner')`,
          [company.rows[0].id, userId]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Configuracao do usuario inicial concluida.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = bootstrap;