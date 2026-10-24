require("dotenv").config();
const express = require("express");
const path = require("node:path");
const pool = require("./db");

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/db", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      database: "connected"
    });
  } catch {
    console.error("Falha na verificacao da conexao com o banco.");

    res.status(503).json({
      status: "error",
      database: "unavailable"
    });
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Meta Ads AI iniciado na porta ${port}`);
});

function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();

  server.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);