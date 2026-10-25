# Retomada — 26/10/2026 | arquitetura e navegação Meta Ads AI

> **Documento de continuidade.** Registrar a evolução confirmada em 25/10/2026. Base: código do repositório e validação manual relatada pelo operador. Não é auditoria E2E automatizada. Leia também `docs/GUIA_DE_RETOMADA_2026-10-25.md`, `docs/TELAS_E_NAVEGACAO.md` e `docs/CADASTRO_CLINICAS_USUARIOS.md`; os trechos antigos desses arquivos sobre rotas e pendências podem estar desatualizados.

## Resultado confirmado pelo operador

- **Bug de navegação resolvido** após PR #82: logo após login, clicar em Campanhas ou Integrações não deve mais piscar/selecionar Visão geral.
- Os PRs #79, #80 e #81 foram tentativas incrementais sem eliminar o bug; **não voltar a aplicar correções CSS ou delays artificiais** para o mesmo sintoma.
- Diagnóstico empírico: o salto acontecia somente nos primeiros segundos após login; após cerca de 30 segundos deixava de ocorrer. A causa interna exata não foi comprovada, mas a separação das rotas HTML resolveu o sintoma no teste do operador.
- O operador confirmou o resultado como **“Resolvido”** após o PR #82.

## Decisão de arquitetura — PR #82

**Campanhas e Integrações passaram de seções do `index.html` para URLs e documentos HTML próprios**, como Gerenciador Meta, Contas/Ativos e Benchmark. O menu lateral usa links `<a href>` para esses módulos; não depende de `data-view` para alternar entre eles. Isso reduz a chance de a inicialização da Visão geral interferir na navegação.

| Módulo | Rota atual | Implementação |
| --- | --- | --- |
| Visão geral | `/` | `public/index.html`, `public/app.js`, `public/home-meta.js` |
| Campanhas | `/campaigns.html` | `public/campaigns.html`, controlador compartilhado `public/app.js` |
| Integrações | `/integrations.html` | `public/integrations.html`, controlador compartilhado `public/app.js` |
| Biblioteca de mídias | `/?view=media` | `public/index.html`, `public/media-library.js` |
| Gerenciador Meta | `/meta-campaigns.html` | Página e scripts Meta existentes |
| Contas e ativos Meta | `/meta-assets.html` | Página e scripts de ativos/workspaces existentes |
| Benchmark | `/benchmark.html` | Benchmark, cache de anúncios e Laboratório de Criativos IA |

**Importante:** as páginas Campanhas e Integrações são HTMLs separados, **mas ainda compartilham JavaScript e alguns componentes DOM** com o dashboard. Não declarar isolamento completo dos módulos. O PR #82 deliberadamente preservou formulários, lógica de rascunhos, seletor de clínica e integrações, priorizando estabilidade. Uma futura extração de scripts específicos deve ter testes de regressão antes de remover componentes.

### Arquivos alterados no PR #82

- Criados: `public/campaigns.html`, `public/integrations.html`.
- Atualizados: `public/index.html`, `public/app.js`, `public/initial-view.js`, `public/meta-campaigns.html`, `public/meta-assets.html`, `public/benchmark.html`, `src/server.js`.
- `src/server.js` exige sessão para as duas novas rotas, antes do middleware estático.
- `initial-view.js` e `app.js` reconhecem a rota pelo `location.pathname` desde o início, evitando selecionar Visão geral por padrão nas páginas novas.
- Links de Campanhas/Integrações nos demais módulos agora apontam para os novos HTMLs; versões dos scripts foram incrementadas para evitar cache.

## Evolução funcional recente (25/10)

- **Gerenciador Meta:** fluxo de anúncios com criação pausada, seleção de objetivo, público, criativos, verificação e publicação sob controle explícito. **Nunca ativar anúncios automaticamente** nem assumir autorização de gastos.
- **Benchmark e Laboratório de Criativos IA:** consulta de anúncios públicos concorrentes, cache PostgreSQL `benchmark_ad_cache`, atualização manual com custo Apify, análise via OpenAI Responses API `gpt-4.1-mini`. PR #77 corrigiu o formato da resposta estruturada; PR #78 reorganizou a apresentação em quatro painéis (estratégia, oportunidades, roteiros de vídeo, textos de anúncio). Operador aprovou visual.
- Plataforma multiempresa: Alps Oral Clinic, Sorriso de Campinas e futuras clínicas; autenticação e papéis por vínculo. Documentação detalhada em `docs/CADASTRO_CLINICAS_USUARIOS.md`.

## Checklist de retomada amanhã

1. Verificar `main` e deploy Railway; confirmar que o PR #82 está integrado e que as rotas `/campaigns.html` e `/integrations.html` funcionam após login.
2. Fazer smoke test de todas as páginas, especialmente Campanhas (rascunhos, dados reais, criação/edição), Integrações, Biblioteca, Gerenciador Meta, Contas/Ativos e Benchmark.
3. Confirmar que troca de clínica, login/logout e controle de sessão funcionam em cada HTML.
4. Só depois considerar refatorar `app.js` e retirar DOM duplicado dos HTMLs novos. Evitar refatoração ampla sem necessidade; mudanças pequenas com PR e validação após deploy.
5. Atualizar o mapa de rotas antigo em `docs/TELAS_E_NAVEGACAO.md` quando consolidar a próxima rodada. Este documento prevalece sobre as rotas antigas citadas ali.

## Operação e segurança

- Repositório: `matioly/meta_ads_ai`; deploy via Railway após merge aprovado pelo operador.
- Bot de WhatsApp da Alps é projeto separado: **não misturar os repositórios**.
- Meta Ads: criação e revisão preferencialmente **PAUSADAS**; ativação exige ação explícita e confirmação.
- Não guardar tokens, cookies de sessão, credenciais ou dados pessoais em documentação.
- Antes de PRs grandes, revisar impacto em rotas, autenticação, estado do workspace e formulários compartilhados.

## Status deste registro

Documentação registrada em branch/PR de documentação, sem alterações no comportamento da aplicação. A validação do bug corrigido foi reportada pelo operador, não reproduzida em teste automatizado.
