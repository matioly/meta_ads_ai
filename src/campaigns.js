const express = require('express')
const pool = require('./db')
const { briefingMiddleware } = require('./briefing')

const router = express.Router()

const access = require('./company-access')
const { uuid } = require('./media-validation')

async function campaignMedia(req, res, next) {
  req.hasMedia = Object.hasOwn(req.body || {}, 'mediaId')
  req.mediaId = req.body?.mediaId ?? null
  if (!req.hasMedia || req.mediaId === null) return next()
  if (typeof req.mediaId !== 'string' || !uuid.test(req.mediaId)) {
    return res.status(400).json({ error: 'Selecione uma mídia válida.' })
  }
  const result = await pool.query('SELECT id FROM media WHERE company_id=$1 AND id=$2', [req.params.companyId, req.mediaId])
  if (!result.rows[0]) return res.status(400).json({ error: 'Mídia indisponível nesta clínica.' })
  next()
}


const objectives = new Set([
  'Conversas no WhatsApp',
  'Geração de leads',
  'Reconhecimento'
])

const fields = `
  id,
  company_id AS company,
  name,
  objective,
  budget_cents AS "budgetCents",
  status,
  briefing,
  media_id AS "mediaId"
`

router.get('/:companyId/campaigns', access, async (req, res) => {
  const result = await pool.query(
    `SELECT ${fields}
     FROM campaigns
     WHERE company_id = $1 AND status = 'draft'
     ORDER BY created_at DESC, id DESC`,
    [req.params.companyId]
  )

  res.json({ campaigns: result.rows })
})

router.post(
  '/:companyId/campaigns',
  access,
  briefingMiddleware,
  campaignMedia,
  async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''

    const objective = req.body?.objective
    const budgetCents = req.body?.budgetCents

    if (
      !name ||
      name.length > 120 ||
      !objectives.has(objective) ||
      !Number.isInteger(budgetCents) ||
      budgetCents < 100 ||
      budgetCents > 10000000
    ) {
      return res.status(400).json({
        error:
          'Informe nome, objetivo válido e orçamento entre R$ 1 e R$ 100.000.'
      })
    }

    const result = await pool.query(
      `INSERT INTO campaigns (
       company_id,
       created_by,
       name,
       objective,
       budget_cents,
       briefing,
       media_id
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING ${fields}`,
      [
        req.params.companyId,
        req.session.userId,
        name,
        objective,
        budgetCents,
        JSON.stringify(req.briefing ?? {}),
        req.mediaId
      ]
    )

    res.status(201).json({ campaign: result.rows[0] })
  }
)

router.delete('/:companyId/campaigns/:campaignId', access, async (req, res) => {
  const result = await pool.query(
    `DELETE FROM campaigns
       WHERE id = $1
         AND company_id = $2
         AND status = 'draft'
       RETURNING id`,
    [req.params.campaignId, req.params.companyId]
  )

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Rascunho não encontrado nesta clínica.'
    })
  }

  res.json({ ok: true })
})

router.put(
  '/:companyId/campaigns/:campaignId',
  access,
  briefingMiddleware,
  campaignMedia,
  async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''

    const objective = req.body?.objective
    const budgetCents = req.body?.budgetCents

    if (
      !name ||
      name.length > 120 ||
      !objectives.has(objective) ||
      !Number.isInteger(budgetCents) ||
      budgetCents < 100 ||
      budgetCents > 10000000
    ) {
      return res.status(400).json({
        error:
          'Informe nome, objetivo válido e orçamento entre R$ 1 e R$ 100.000.'
      })
    }

    const result = await pool.query(
      `UPDATE campaigns
       SET name = $1,
           objective = $2,
           budget_cents = $3,
           briefing = COALESCE($6::jsonb, briefing),
           media_id = CASE WHEN $7::boolean THEN $8::uuid ELSE media_id END
       WHERE id = $4
         AND company_id = $5
         AND status = 'draft'
       RETURNING ${fields}`,
      [
        name,
        objective,
        budgetCents,
        req.params.campaignId,
        req.params.companyId,
        req.briefing === null ? null : JSON.stringify(req.briefing),
        req.hasMedia,
        req.mediaId
      ]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Rascunho não encontrado nesta clínica.'
      })
    }

    res.json({ campaign: result.rows[0] })
  }
)

module.exports = router

