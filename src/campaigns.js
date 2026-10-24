const express = require('express')
const pool = require('./db')
const { briefingMiddleware } = require('./briefing')

const router = express.Router()

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  briefing
`

async function access (req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: 'Faça login para continuar.'
    })
  }

  if (
    !uuid.test(req.params.companyId) ||
    (req.params.campaignId && !uuid.test(req.params.campaignId))
  ) {
    return res.status(400).json({
      error: 'Identificador inválido.'
    })
  }

  const result = await pool.query(
    `SELECT role
     FROM company_members
     WHERE company_id = $1 AND user_id = $2`,
    [req.params.companyId, req.session.userId]
  )

  const membership = result.rows[0]

  if (!membership) {
    return res.status(403).json({
      error: 'Você não tem acesso a esta clínica.'
    })
  }

  if (req.method !== 'GET' && !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({
      error: 'Seu acesso permite apenas consultar.'
    })
  }

  next()
}

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
       briefing
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING ${fields}`,
      [
        req.params.companyId,
        req.session.userId,
        name,
        objective,
        budgetCents,
        JSON.stringify(req.briefing ?? {})
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
           briefing = COALESCE($6::jsonb, briefing)
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
        req.briefing === null ? null : JSON.stringify(req.briefing)
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
