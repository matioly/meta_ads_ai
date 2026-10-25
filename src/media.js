const express = require("express");
const pool = require("./db");
const access = require("./company-access");
const { accountInput, mediaInput } = require("./media-validation");
const router = express.Router();

function validate(parser) {
  return (req, res, next) => {
    try { req.input = parser(req.body); next(); }
    catch (error) { res.status(400).json({ error: error.message }); }
  };
}
function databaseError(error, res, next) {
  if (error.code === "23505") return res.status(409).json({ error: "Esse apelido ou arquivo já está cadastrado nesta clínica." });
  if (error.code === "23503") return res.status(409).json({ error: "Registro vinculado ou indisponível nesta clínica. Remova os vínculos antes de excluir." });
  next(error);
}
const accountFields = "id, label, email";
const mediaFields = 'm.id, m.name, m.kind, m.account_id AS "accountId", a.label AS "accountLabel", a.email AS "accountEmail", m.drive_url AS url, m.notes';

router.get("/:companyId/drive-accounts", access, async (req, res) => {
  const result = await pool.query(
    "SELECT " + accountFields + " FROM drive_accounts WHERE company_id = $1 ORDER BY label, id",
    [req.params.companyId]
  );
  res.json({ accounts: result.rows });
});

for (const method of ["post", "put"]) {
  const suffix = method === "put" ? "/:accountId" : "";
  router[method]("/:companyId/drive-accounts" + suffix, access, validate(accountInput), async (req, res, next) => {
    try {
      const { label, email } = req.input;
      const result = method === "post"
        ? await pool.query("INSERT INTO drive_accounts(company_id,label,email) VALUES($1,$2,$3) RETURNING " + accountFields,
            [req.params.companyId,label,email])
        : await pool.query("UPDATE drive_accounts SET label=$2,email=$3 WHERE company_id=$1 AND id=$4 RETURNING " + accountFields,
            [req.params.companyId,label,email,req.params.accountId]);
      if (!result.rows[0]) return res.status(404).json({ error: "Conta não encontrada nesta clínica." });
      res.status(method === "post" ? 201 : 200).json({ account: result.rows[0] });
    } catch (error) { databaseError(error, res, next); }
  });
}

router.get("/:companyId/media", access, async (req, res) => {
  const result = await pool.query(
    "SELECT " + mediaFields + " FROM media m JOIN drive_accounts a ON a.id=m.account_id AND a.company_id=m.company_id WHERE m.company_id=$1 ORDER BY m.created_at DESC, m.id DESC",
    [req.params.companyId]
  );
  res.json({ media: result.rows });
});

for (const method of ["post", "put"]) {
  const suffix = method === "put" ? "/:mediaId" : "";
  router[method]("/:companyId/media" + suffix, access, validate(mediaInput), async (req, res, next) => {
    try {
      const { name, kind, accountId, notes, link } = req.input;
      const account = await pool.query("SELECT id FROM drive_accounts WHERE company_id=$1 AND id=$2", [req.params.companyId,accountId]);
      if (!account.rows[0]) return res.status(400).json({ error: "Selecione uma conta desta clínica." });
      const values = [req.params.companyId,accountId,name,kind,link.id,link.url,notes];
      const result = method === "post"
        ? await pool.query("INSERT INTO media(company_id,account_id,name,kind,drive_file_id,drive_url,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id", values)
        : await pool.query("UPDATE media SET account_id=$2,name=$3,kind=$4,drive_file_id=$5,drive_url=$6,notes=$7 WHERE company_id=$1 AND id=$8 RETURNING id", [...values,req.params.mediaId]);
      if (!result.rows[0]) return res.status(404).json({ error: "Mídia não encontrada nesta clínica." });
      res.status(method === "post" ? 201 : 200).json({ id: result.rows[0].id });
    } catch (error) { databaseError(error,res,next); }
  });
}

for (const [path, table, param] of [["media","media","mediaId"],["drive-accounts","drive_accounts","accountId"]]) {
  router.delete("/:companyId/" + path + "/:" + param, access, async (req,res,next) => {
    try {
      // Table and parameter come only from the fixed list above.
      const result = await pool.query("DELETE FROM " + table + " WHERE company_id=$1 AND id=$2 RETURNING id", [req.params.companyId,req.params[param]]);
      if (!result.rowCount) return res.status(404).json({ error: "Registro não encontrado nesta clínica." });
      res.json({ ok: true });
    } catch (error) { databaseError(error,res,next); }
  });
}
module.exports = router;

