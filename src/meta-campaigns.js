const express = require("express");
const pool = require("./db");
const access = require("./company-access");
const router = express.Router();

router.get("/:companyId/meta-campaigns", access, async (req, res, next) => {
  try {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) return res.status(503).json({ error: "Conexão Meta não configurada." });

    const { rows } = await pool.query(
      "SELECT ad_account_id FROM meta_assets WHERE company_id = $1",
      [req.params.companyId]
    );
    const id = rows[0]?.ad_account_id;
    if (!id || !/^[0-9]{1,30}$/.test(id)) {
      return res.status(422).json({ error: "Cadastre a conta de anúncios no inventário da clínica." });
    }

    const version = /^v\d+\.\d+$/.test(process.env.META_API_VERSION || "")
      ? process.env.META_API_VERSION : "v24.0";
    const url = new URL(`https://graph.facebook.com/${version}/act_${id}/campaigns`);
    url.searchParams.set("fields", "id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time");
    url.searchParams.set("limit", "100");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!response.ok) {
      const code = Number(data?.error?.code);
      return res.status([190, 10, 200].includes(code) ? 403 : 502).json({
        error: "Não foi possível consultar as campanhas na Meta. Verifique permissões e token.",
        metaErrorCode: Number.isFinite(code) ? code : null
      });
    }
    if (!Array.isArray(data.data)) {
      return res.status(502).json({ error: "Resposta inesperada da Meta." });
    }

    const campaigns = data.data.map(c => ({
      id: c.id, name: c.name, objective: c.objective,
      status: c.status, effectiveStatus: c.effective_status,
      dailyBudget: c.daily_budget ?? null,
      lifetimeBudget: c.lifetime_budget ?? null,
      createdTime: c.created_time ?? null
    }));
    res.json({
      campaigns,
      hasMore: Boolean(data.paging?.next),
      note: "Orçamentos são valores retornados pela Meta na menor unidade monetária; podem estar definidos no conjunto de anúncios."
    });
  } catch (error) {
    if (["TimeoutError", "AbortError"].includes(error.name)) {
      return res.status(504).json({ error: "Tempo limite ao consultar a Meta." });
    }
    next(error);
  }
});

module.exports = router;
