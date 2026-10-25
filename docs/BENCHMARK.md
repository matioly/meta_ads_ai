# Benchmark V1 — cadastro de concorrentes

Novo módulo independente em /benchmark.html, preservando as views existentes. Até cinco concorrentes por clínica, armazenados no PostgreSQL (migration 014). O cadastro suporta nome, cidade, UF, especialidade, Instagram, Facebook e observações.

API autenticada: GET/POST /api/companies/:companyId/benchmark-competitors; PUT/DELETE /:competitorId. Acesso de leitura a membros da clínica; escrita somente owner/admin. Escopo obrigatório de company_id; limite de cinco imposto transacionalmente no servidor. Links de redes sociais aceitam apenas HTTPS e domínios oficiais.

A opção Ver anúncios abre a Biblioteca pública da Meta com pesquisa pelo nome do concorrente. **Não há coleta automática de anúncios, integração com API externa ou análise de IA nesta versão.** A pesquisa por nome pode retornar páginas homônimas; conferir o anunciante na Biblioteca antes de usar como referência.

Após merge, executar migrations pelo pré-deploy do Railway. Testar cadastro de cinco, bloqueio do sexto, edição, exclusão, troca de clínica e papel de leitura. Conferir navegação nas páginas principal, Gerenciador Meta e Contas e ativos.
