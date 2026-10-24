const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("Configure a variavel DATABASE_URL antes de iniciar.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 5000,
  query_timeout: 6000
});

pool.on("error", () => {
  console.error("Uma conexao ociosa com o banco foi interrompida.");
});

module.exports = pool;