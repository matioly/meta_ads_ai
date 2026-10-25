# Guia principal de retomada — 25/10/2026

> **LEIA PRIMEIRO.** Fotografia do código na main após o PR #62. Este documento prevalece sobre afirmações históricas desatualizadas do README e de documentos antigos. Repositório: `matioly/meta_ads_ai`. Aplicação Meta Ads AI, **separada** do bot WhatsApp `assistente_alps`. A documentação é baseada no código e nos testes relatados pelo operador; não representa auditoria de produção nem comprovação do último deploy.

## 1. Objetivo e decisões de produto

Plataforma própria e multiempresa para Alps Oral Clinic, Sorriso de Campinas e futuras clínicas/negócios. Permitir a um operador autenticado selecionar clínica, gerenciar contas e ativos Meta, consultar campanhas e resultados, planejar campanhas, criar campanha/conjunto/anúncio **PAUSADOS**, preparar criativos e futuramente usar IA para assistência. Os vídeos são fornecidos pelo operador. Manter Railway e GitHub. **Não ativar campanhas/anúncios automaticamente.** Ativação somente mediante ação explícita e autorizada no fluxo específico. Nenhum desenvolvimento desta rodada autorizou gastos.

## 2. Onde estamos

- Login, logout, sessões PostgreSQL, múltiplas clínicas, autorização por vínculo.
- Dashboard renovado: métricas reais da Meta nos últimos 30 dias, CTA para Gerenciador Meta, contagem de campanhas e anúncios; não confundir orçamento planejado de rascunhos com gasto real.
- Navegação lateral: Visão geral, Campanhas (campanhas reais e rascunhos), Gerenciador Meta (workflow), Biblioteca de mídias (links Drive), Integrações (cards), Contas e ativos Meta (configuração).
- Layout comum de sidebar/topbar no painel, Gerenciador e Contas e ativos. Menu de páginas independentes usa links reais `/?view=...`; painel usa botões `data-view`.
- Cadastro de nova clínica e novo usuário diretamente em Contas e ativos Meta. Owner cria clínica e vira owner; owner da clínica cria usuário novo com papel admin/viewer; visualização de usuários vinculados. Sem fluxo de associar e-mail preexistente, redefinir senha, convite por e-mail, remover usuário ou alterar papéis.
- Gerenciador Meta com workflow de campanha, conjunto, criativo/vídeo, anúncio pausado e ativação explícita; estados colapsados por padrão segundo solicitações anteriores; validar interface atual no navegador.
- Biblioteca Drive: registra metadados/links; **não é upload nem OAuth do Google**.
- O operador confirmou em 24–25/10 a criação de campanha/conjunto PAUSADOS e de anúncio PAUSADO com ID Meta `120249784427940576` e verificou telas. Não assumir que todos os casos de objetivo/destino funcionam.
- **Último PR #62**: tentativa de eliminar o flash da Visão geral ao entrar em Campanhas. Foi mergeado, mas **o operador ainda não confirmou que o flash desapareceu após o deploy**. Não declarar esse bug resolvido sem teste.
- Mudanças documentais desta rodada não alteram endpoints, tabelas, permissões ou lógica de anúncios.

## 3. Ordem de leitura ao voltar

1. Este guia: estado, evidências e pendências.
2. [Telas e navegação](TELAS_E_NAVEGACAO.md): mapa de telas, scripts, fluxo de view, histórico dos bugs e testes.
3. [Cadastro e acesso](CADASTRO_CLINICAS_USUARIOS.md): regras, APIs, validações, roles, UX e limites.
4. [Arquitetura](ARQUITETURA.md): histórico + atualização prioritária no início.
5. [Operação](OPERACAO.md): implantação, variáveis e checklist.
6. [Retomada histórica](RETOMADA.md), [Backlog](BACKLOG.md), [CHANGELOG](../CHANGELOG.md), [Fase 5](FASE_5_VIDEO_ANUNCIO.md), [Site](FASE_5_SITE.md), [Biblioteca Drive](BIBLIOTECA_DRIVE.md).

## 4. Mapa de código essencial

| Responsabilidade | Arquivos |
|---|---|
| API, sessão, rotas, páginas protegidas | `src/server.js` |
| Banco e migrations | `src/db.js`, `src/migrate.js`, `src/migrations/*.sql` |
| Autorização por clínica | `src/company-access.js`, `src/campaigns.js` |
| Clínica/usuário novo | `src/workspace-admin.js`, `public/workspace-admin.js` |
| Inventário Meta | `src/meta-assets.js`, `public/meta-assets.html`, `public/meta-assets.js` |
| Shell de páginas Meta | `public/meta-shell.js`, `public/meta-shell.css` |
| Painel e views | `public/index.html`, `public/app.js`, `public/styles.css` |
| Dashboard Meta | `public/home-meta.js`, `src/meta-insights.js`, `src/meta-campaigns.js` |
| Biblioteca Drive | `src/media.js`, `public/media-library.js` |
| Integrações | `public/index.html`, `public/styles.css` |
| Gerenciador/workflow | `public/meta-campaigns.html`, `public/meta-workflow.js`, `public/meta-workflow.css`, `public/meta-*.js`, `src/meta-*.js`, `src/creative-drafts.js` |
| Estilo Contas e ativos | `public/settings.css` |

## 5. Sequência dos PRs desta rodada

| PR | Entrega / causa |
|---|---|
| #55 | Layout de Contas e ativos integrado ao shell, formulário para criar clínica, usuário, listagem de membros, novas rotas workspace-admin |
| #56 | Reformulação dashboard 30 dias, Integrações, links reais na sidebar do Gerenciador e Contas/Ativos, ajustes do app |
| #57 | Correções de links e acabamento dos formulários |
| #58 | Corrigido listener de `#hero-create` removido do HTML |
| #59 | Corrigido **segundo** acesso nulo a `#hero-create` dentro de `render()`; logout não deve ficar bloqueado pelo carregamento |
| #60 | Modernização da Biblioteca (fontes, tabelas, cabeçalho); pré-seleção de view na inicialização |
| #61 | CSS no head para esconder overview antes do primeiro paint quando URL aponta outra view |
| #62 | Pré-seleção da view no head e visibilidade do conteúdo principal apenas após a seleção síncrona no fim do HTML |

Todos foram mergeados à `main`. Atenção: os PRs #58–#62 são uma cadeia de correções de navegação, não garantia de teste end-to-end em browser. O flash de Campanhas motivou #62 e requer reteste.

## 6. Bugs e lições

**Travamento crítico (resolvido segundo relato após #59):** ao remover o botão `#hero-create` da Visão geral, `public/app.js` ainda acessava o nó em `addEventListener` e em `render()`. Isso interrompia a execução antes de `loadProfile()`, deixando 'Carregando clínicas', menu inoperante e botão Sair bloqueado. Verificar DOM antes de acessar elementos opcionais e testar inicialização sem dados carregados.

**Flash da Visão geral:** `index.html` contém por padrão seção overview visível; links externos usam `/?view=campaigns`, `/?view=media`, `/?view=integrations`; o script diferido e a pré-seleção síncrona podem produzir transição perceptível. Código atual usa `data-initial-view` no `<head>`, estilo de visibilidade e script ao final do `<body>`. O `changeView` também atualiza histórico com `replaceState`. Se continuar, **investigar a navegação completa e o ciclo de pintura**, inclusive cache/deploy, ao invés de acrescentar mais patches CSS; preferir uma fonte única de verdade para a view inicial. Verificar se o problema ocorre só ao chegar de `meta-assets.html`/`meta-campaigns.html` ou também em troca interna.

**Integrações/Biblioteca/Campanhas não abriam:** os botões `data-view` em páginas independentes não tinham os listeners de `app.js`; foram trocados por âncoras para `/?view=...`. No painel os botões são atendidos por `changeView`.

## 7. Checklist de retomada e homologação

- Confirmar deploy Railway da última main e limpar cache (`Ctrl+Shift+R`).
- Login, selecionar Alps e Sorriso; navegar ida e volta entre todas as seis entradas do menu; conferir estado ativo, sem flash.
- Clicar em Sair mesmo com APIs lentas; garantir logout.
- Contas e ativos: salvar/ler inventário; criar clínica de teste, alternar, criar usuário novo admin/viewer, efetuar login com novo usuário; conferir que viewer não escreve; conferir isolamento entre clínicas.
- Dashboard: confrontar gasto, alcance, impressões, cliques e conversas dos últimos 30 dias com Meta; tratar indisponibilidade e ausência de dados sem mostrar valores inventados.
- Biblioteca: cadastrar conta/link, editar, remover cadastro sem apagar arquivo Google; verificar acesso/isolamento.
- Gerenciador: leitura de campanhas/conjuntos/anúncios; criar apenas objetos **PAUSADOS** com confirmação; conferir IDs/status na Meta e no painel; não duplicar em caso de timeout.
- `npm test`, `npm run db:migrate` em ambiente isolado e `/health/db`. Nenhum teste automatizado ou deploy foi executado como parte desta atualização de docs.

## 8. Pendências e prioridades

1. Confirmar visualmente a correção #62; se falhar, refatorar navegação com estado inicial único e teste automatizado/browser.
2. Validar fluxos multiempresa e cadastro de usuário real em produção, com conta de teste e dados não sensíveis.
3. Validar dashboard 30 dias e moedas/atribuição contra Meta.
4. Revisar segurança, permissões, idempotência de criação e ativação, especialmente em retries e timeouts.
5. Evoluir UI do workflow e interesses/públicos sem expor lat/long ao operador; preferir cidade e seleção compreensível.
6. Evoluir multiempresa: vínculo de usuário existente, gestão de convites, troca de papel, desativação, recuperação de senha e trilha de auditoria.
7. IA assistida, Drive OAuth, upload streaming, criativos, automação somente após aprovação explícita.

**Regra de documentação:** sempre atualizar este guia, CHANGELOG e backlog após mudanças relevantes, com número do PR, o que foi testado e o que ainda não foi.
