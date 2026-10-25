const pool = require("./db");
const { uuid } = require("./media-validation");

module.exports = async function access(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: "Faça login para continuar." });
  for (const key of ["companyId", "campaignId", "accountId", "mediaId"]) {
    if ((key === "companyId" || req.params[key] !== undefined) && !uuid.test(req.params[key] || "")) {
      return res.status(400).json({ error: "Identificador inválido." });
    }
  }
  const result = await pool.query(
    "SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2",
    [req.params.companyId, req.session.userId]
  );
  if (!result.rows[0]) return res.status(403).json({ error: "Você não tem acesso a esta clínica." });
  if (!["GET", "HEAD"].includes(req.method) && !["owner", "admin"].includes(result.rows[0].role)) {
    return res.status(403).json({ error: "Seu acesso permite apenas consultar." });
  }
  next();
};

