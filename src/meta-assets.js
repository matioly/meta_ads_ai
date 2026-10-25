const express = require('express');
const pool = require('./db');
const access = require('./company-access');
const router = express.Router();
const fields = ['businessId','adAccountId','instagramId','instagramHandle','facebookPageId','facebookPageStatus','whatsappBusinessId','whatsappPhone','notes'];
const columns = ['business_id','ad_account_id','instagram_id','instagram_handle','facebook_page_id','facebook_page_status','whatsapp_business_id','whatsapp_phone','notes'];
const projection = columns.map((col,i) => col + ' AS "' + fields[i] + '"').join(', ');
const empty = Object.fromEntries(fields.map(f => [f, f === 'facebookPageStatus' ? 'unknown' : '']));
function parse(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !fields.includes(k))) throw Error('Campos inválidos.');
  const value = {};
  for (const field of fields) {
    if (typeof body[field] !== 'string') throw Error('Preencha os campos em texto.');
    value[field] = body[field].trim();
  }
  for (const field of ['businessId','adAccountId','instagramId','facebookPageId','whatsappBusinessId']) {
    if (value[field] && !/^[0-9]{1,30}$/.test(value[field])) throw Error(field + ': informe apenas os números do ID.');
  }
  if (!['unknown','pending','approved'].includes(value.facebookPageStatus)) throw Error('Status da página inválido.');
  for (const [field,max] of Object.entries({instagramHandle:120,whatsappPhone:25,notes:500})) {
    if (value[field].length > max) throw Error(field + ': texto muito longo.');
  }
  if (value.whatsappPhone && !/^\+?[0-9 ()-]{7,25}$/.test(value.whatsappPhone)) throw Error('Telefone inválido.');
  return value;
}
router.get('/:companyId/meta-assets', access, async (req,res,next) => {
  try {
    const result = await pool.query('SELECT ' + projection + ' FROM meta_assets WHERE company_id=$1',[req.params.companyId]);
    res.json({assets:result.rows[0] || empty});
  } catch (e) { next(e); }
});
router.put('/:companyId/meta-assets', access, async (req,res,next) => {
  let data;
  try { data = parse(req.body); } catch(e) { return res.status(400).json({error:e.message}); }
  try {
    const placeholders = columns.map((_,i)=>'$'+(i+2));
    const sql = 'INSERT INTO meta_assets (company_id,'+columns.join(',')+') VALUES ($1,'+placeholders.join(',')+') ON CONFLICT(company_id) DO UPDATE SET '+columns.map(c=>c+'=EXCLUDED.'+c).join(',')+',updated_at=now() RETURNING '+projection;
    const result = await pool.query(sql,[req.params.companyId,...fields.map(f=>data[f])]);
    res.json({assets:result.rows[0]});
  } catch(e) { next(e); }
});
module.exports = router;
