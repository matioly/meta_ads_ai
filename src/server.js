require("dotenv").config();

const express = require("express");
const path = require("node:path");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");

const pool = require("./db");
const bootstrap = require("./bootstrap");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "..", "public");

const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || "";
const appUrl = process.env.APP_URL || "";

if (sessionSecret.length < 32 || !appUrl) {
  throw new Error("Configure SESSION_SECRET e APP_URL.");
}

const appOrigin = new URL(appUrl).origin;

if (isProduction && !appOrigin.startsWith("https://")) {
  throw new Error("APP_URL deve usar HTTPS em producao.");
}

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/"
};

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "16kb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/db", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({
      status: "error",
      database: "unavailable"
    });
  }
});

const sessionStore = new PgSession({
  pool,
  tableName: "user_sessions",
  createTableIfMissing: false,
  errorLog: () => console.error("Falha no armazenamento de sessoes.")
});

app.use(session({
  name: "meta_ads_sid",
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    ...cookieOptions,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");

  // Protege requisicoes que alteram estado contra outras origens.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.get("origin") !== appOrigin) {
      return res.status(403).json({
        error: "Origem da solicitação não permitida."
      });
    }

    if (!req.is("application/json")) {
      return res.status(415).json({
        error: "Envie os dados no formato JSON."
      });
    }
  }

  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: "Muitas tentativas. Aguarde 15 minutos e tente novamente."
  }
});

let dummyHash;

app.post("/api/login", loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

    const password = typeof req.body?.password === "string"
      ? req.body.password
      : "";

    if (
      !email ||
      email.length > 254 ||
      !password ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(401).json({
        error: "E-mail ou senha inválidos."
      });
    }

    const result = await pool.query(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    // Executa a verificacao mesmo quando o e-mail nao existe.
    const valid = await bcrypt.compare(
      password,
      user ? user.password_hash : dummyHash
    );

    if (!user || !valid) {
      return res.status(401).json({
        error: "E-mail ou senha inválidos."
      });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    req.session.userId = user.id;

    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Faça login para continuar." });
  }

  next();
}

app.use("/api/companies", requireLogin, require("./campaigns"));
app.use("/api/companies", requireLogin, require("./media"));
app.use("/api/companies", requireLogin, require("./meta-assets"));

app.get("/api/me", requireLogin, async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1",
    [req.session.userId]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: "Sessão inválida." });
  }

  const companies = await pool.query(
    `SELECT c.id, c.name, m.role
     FROM companies c
     JOIN company_members m ON m.company_id = c.id
     WHERE m.user_id = $1
     ORDER BY c.name`,
    [user.id]
  );

  res.json({ user, companies: companies.rows });
});

app.post("/api/logout", requireLogin, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("meta_ads_sid", cookieOptions);
    res.json({ ok: true });
  });
});

app.get("/login", (req, res) => {
  res.set("Cache-Control", "no-store");

  if (req.session.userId) return res.redirect("/");

  res.sendFile(path.join(publicDir, "login.html"));
});

// Executado antes do middleware de arquivos estaticos.
app.get(["/", "/index.html"], (req, res) => {
  res.set("Cache-Control", "no-store");

  if (!req.session.userId) return res.redirect("/login");

  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(express.static(publicDir, {
  index: false,
  dotfiles: "deny"
}));

app.use((error, req, res, next) => {
  console.error("Falha na requisicao.", {
    code: error.code || "REQUEST_ERROR",
    path: req.path
  });

  if (res.headersSent) return next(error);

  res.status(500).json({
    error: "Não foi possível concluir. Tente novamente."
  });
});

let server;

async function start() {
  try {
    await bootstrap();

    dummyHash = await bcrypt.hash(
      require("node:crypto").randomBytes(32).toString("hex"),
      12
    );

    server = app.listen(port, "0.0.0.0", () => {
      console.log(`Meta Ads AI iniciado na porta ${port}`);
    });
  } catch (error) {
    console.error(
      "Falha na inicializacao:",
      error.code || error.message
    );

    await pool.end();
    process.exitCode = 1;
  }
}

function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();

  if (!server) return process.exit(0);

  server.close(async () => {
    try {
      sessionStore.close();
      await pool.end();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

start();
