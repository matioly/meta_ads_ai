const limits = {
  service: 120,
  offer: 500,
  audience: 300,
  region: 200,
  message: 500,
  destination: 200,
  notes: 500
};

function validateBriefing(value) {
  // Clientes antigos podem não enviar briefing.
  if (value === undefined) return null;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("O briefing deve ser um objeto.");
  }

  if (Object.keys(value).some((key) => !Object.hasOwn(limits, key))) {
    throw new Error("O briefing contém um campo desconhecido.");
  }

  const result = {};

  for (const [key, limit] of Object.entries(limits)) {
    const text = value[key] === undefined ? "" : value[key];

    if (typeof text !== "string" || text.length > limit) {
      throw new Error(
        "Campo " + key + ": informe um texto de até " + limit + " caracteres."
      );
    }

    result[key] = text.trim();
  }

  return result;
}

function briefingMiddleware(req, res, next) {
  try {
    req.briefing = validateBriefing(req.body?.briefing);
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { validateBriefing, briefingMiddleware };