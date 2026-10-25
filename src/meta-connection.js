const express = require("express");
const pool = require("./db");
const access = require("./company-access");

const router = express.Router();
const TIMEOUT_MS = 8000;

router.get("/:companyId/meta-connection", access, async (req, res, next) => {
  try {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) return res.status(503).json({ connected: false, error: "META_ACCESS_TOKEN não configurado." });

    const result = await pool.query(
      "SELECT ad_account_id FROM meta_assets WHERE company_id = $1",
      [req.params.companyId]
    );
    const id = result.rows[0]?.ad_account_id;
    if (!id || !/^[0-9]{1,30}$/.test(id)) {
      return res.status(422).json({ connected: false, error: "Cadastre o ID da conta de anúncios no inventário." });
    }

    const version = /^v\d+\.\d+$/.test(process.env.META_API_VERSION || "")
      ? process.env.META_API_VERSION : "v24.0";
    const url = new URL(`https://graph.facebook.com/${version}/act_${id}`);
    url.searchParams.set("fields", "id,name,account_status,currency,timezone_name");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const data = await response.json();
    if (!response.ok) {
      const errorCode = Number(data?.error?.code);
      return res.status([190, 10, 200].includes(errorCode) ? 403 : 502).json({
        connected: false,
        error: "A Meta recusou a consulta. Verifique o token e as permissões.",
        metaErrorCode: Number.isFinite(errorCode) ? errorCode : null
      });
    }
    if (data.id !== `act_${id}`) {
      return res.status(502).json({ connected: false, error: "A Meta retornou outra conta." });
    }
    res.json({
      connected: true,
      account: {
        id: data.id, name: data.name, status: data.account_status,
        currency: data.currency, timezone: data.timezone_name
      }
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({ connected: false, error: "Tempo limite de conexão com a Meta." });
    }
    next(error);
  }
});

module.exports = router;
