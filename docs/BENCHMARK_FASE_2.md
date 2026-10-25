# Benchmark fase 2 — coleção de anúncios observados

Adiciona uma coleção **manual e auditável** de anúncios por concorrente, isolada por clínica. A interface permite registrar título, link público da Meta, formato, texto, gancho e chamada para ação. Cada registro recebe a data de observação. É possível excluir registros.

O botão Ver anúncios continua abrindo a pesquisa pública da Biblioteca da Meta. O novo botão Analisar anúncios abre os registros internos. **Não há scraping, importação automática, métricas privadas, nem análise por IA nesta etapa.** Dados de texto são fornecidos pelo operador, não são extraídos automaticamente da página. O link pode deixar de funcionar e não prova que o anúncio segue ativo.

Migration 015 cria benchmark_ads. Endpoints autenticados GET/POST /api/companies/:companyId/benchmark-competitors/:competitorId/ads e DELETE /:adId. Escrita restrita a owner/admin. URLs aceitas somente nos domínios oficiais Facebook/Instagram, HTTPS. Sem alteração nos fluxos de publicação.

Checklist: testar cadastro, recarga, exclusão, duplicata, troca de clínica, usuário somente leitura e links externos. Depois avaliar fonte autorizada para importação e análise IA sobre dados efetivamente disponíveis.
