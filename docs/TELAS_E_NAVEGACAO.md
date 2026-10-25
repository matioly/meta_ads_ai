# Telas, navegação e design — estado 25/10/2026

## Rotas e componentes

| Menu | URL | HTML/JS | Conteúdo |
|---|---|---|---|
| Visão geral | `/?view=overview` ou `/` | `index.html`, `app.js`, `home-meta.js` | Dashboard de 30 dias com Meta Insights e atalhos |
| Campanhas | `/?view=campaigns` | `index.html`, `app.js`, `home-meta.js` | Lista de campanhas reais Meta e rascunhos locais |
| Gerenciador Meta | `/meta-campaigns.html` | `meta-campaigns.html`, scripts `meta-*.js` | Workflow de criação/consulta/ativação controlada |
| Biblioteca de mídias | `/?view=media` | `index.html`, `media-library.js` | Cadastro de contas e links Drive, edição e exclusão |
| Integrações | `/?view=integrations` | `index.html` | Cards Meta Ads e assistente futuro |
| Contas e ativos Meta | `/meta-assets.html` | `meta-assets.html`, `meta-assets.js`, `workspace-admin.js` | IDs Meta, criar clínica, criar usuário e membros |

## Layout compartilhado

Sidebar à esquerda com marca, seletor de espaço de trabalho, links de painel e configuração; topbar com nome da clínica, usuário e botão Sair; conteúdo à direita. O Gerenciador e Contas e ativos usam `meta-shell.js` para popular `#company` (sidebar) e sincronizar com `#meta-company` (seletor interno). O painel principal usa `app.js` e `#company`. Não duplicar menus de navegação no conteúdo do Gerenciador.

**Design:** estilos base em `styles.css`; `meta-shell.css` para shell; `meta-workflow.css` para workflow; `settings.css` para formulários e usuários. Biblioteca recebeu `.media-library-panel`, `.media-library-heading` e estilos de tabela/cards no PR #60. Integrações usa `.integration-grid`/`.integration-card`. Preservar hierarquia tipográfica, espaços e responsividade.

## Dashboard

`home-meta.js` consulta em paralelo `/api/companies/:companyId/meta-campaigns`, `.../meta-campaigns/ads` e `.../meta-insights?period=last_30d` (conferir rotas exatas no código antes de alterar). IDs de UI: `#dashboard-spend`, `#dashboard-reach`, `#dashboard-impressions`, `#dashboard-links`, `#dashboard-conversations`, `#meta-campaign-count`, `#meta-ad-count`, `#meta-home-feedback`. Os IDs `#draft-count` e `#planned-budget` permanecem ocultos por compatibilidade com `render()`. Dados são agregados por conta Meta, não necessariamente por campanha. A Meta pode não fornecer evento de conversa iniciada.

## Como a navegação funciona atualmente

1. Na página principal, `[data-view]` dispara `changeView(view)` em `app.js`. A função alterna `hidden` em `#overview-section`, `#campaign-section`, `#meta-real-campaigns`, `#media-section`, `#integrations-section`; define o item ativo e sincroniza `?view=` via `history.replaceState`.
2. Em páginas HTML independentes, a sidebar usa `<a href="/?view=...">` para retornar à principal, **não** botões `data-view` sem listeners.
3. `index.html` inicializa `document.documentElement.dataset.initialView` no `<head>`, aplica regras CSS de first paint e tem script síncrono ao final do body para selecionar a seção. `app.js` reforça a view após carregar `/api/me`. `media-library.js` chama `loadProfile()` após scripts diferidos.
4. `#new-campaign` foi ocultado no redesign; `#hero-create` foi removido. Qualquer novo uso de `$('#hero-create')` precisa ser opcional. PR #58 corrigiu listener; #59 corrigiu `render()`.
5. A visibilidade inicial de `.main main` depende de `data-view-ready`; garantir que o script síncrono de inicialização sempre execute, inclusive quando view não está na URL.

## Sintomas e diagnóstico

| Sintoma | Provável causa / ação |
|---|---|
| Visão geral aparece por fração de segundo antes de Campanhas | First paint antes da aplicação de `?view`; verificar head, script de final de body, cache e ordem de carregamento |
| Clicar em Campanhas/Biblioteca/Integrações não faz nada em Gerenciador/Contas | Âncora ausente ou botão `data-view` sem `app.js`; verificar `href` |
| 'Carregando clínicas…' permanente | Exceção JS antes de `loadProfile` ou erro de API; conferir console e `/api/me` |
| Botão Sair travado | `render()` antigo desabilitava logout durante `busy`; PR #59 o mantém disponível |
| Dashboard com valores ausentes | Falha de Meta API/token/conta/permissão, ou período sem dados; verificar status de `meta-insights` |
| Biblioteca com tipografia antiga | CSS em cache ou classe `media-library-panel` não aplicada |

## Teste manual recomendado

A partir de Visão geral, clique em Campanhas → Biblioteca → Integrações → Gerenciador Meta → Contas e ativos → Campanhas → Visão geral. Repita usando recarga direta de cada URL `?view=`, troca de clínica, navegador móvel e desktop. Observar flash, seleção de menu, textos, tabelas, modais, botão Sair e console. Capturar URL antes/depois e erros JS se o flash persistir.

## Histórico recente

PR #55: shell + administração; #56/#57: dashboard/integrações/links; #58/#59: exceções JS; #60: Biblioteca + pré-seleção; #61/#62: first paint. **A correção visual #62 aguarda aceite do operador após deploy.** Evitar registrar como homologada prematuramente.
