## 25/10/2026 — Diagnóstico dos campos do passo 5B

- Consulta autenticada por clínica, somente leitura, em GET /api/companies/:companyId/creative-drafts/:draftId/meta-ad-diagnostic.
- Botão para comparar valores reais de campanha/conjunto com os requisitos de site, sem criar anúncio.
- Erro 422 de configuração passa a identificar campos incompatíveis; mantém os requisitos de conta, vínculo, PAUSED, OUTCOME_TRAFFIC, WEBSITE e LINK_CLICKS.
- Testes de divergência, dados ausentes, filtragem de resposta e ausência de escrita Meta no diagnóstico/bloqueio. Produção ainda não validada.

## 25/10/2026 — Marco META04.2/04.3 e PR #20 META05A/5B

**Validado pelo operador:** campanha e conjunto PAUSADOS criados na Meta (conjunto 120249780122340576); rascunho de criativo com vídeo Pamela ADS2 salvo e recuperado com todos os campos. Erros Meta resolvidos durante testes: 100/4834011 (compartilhamento de orçamento), 100/1815715 (destino), 100/2490487 (bid/ROAS/otimização), 100/1870227 (Advantage+ audience).

**Implementado, não homologado:** PR #20 adicionou migration 013, IDs Meta no rascunho, envio de vídeo do Google Drive, criação explícita de criativo/anúncio PAUSADO, confirmação manual, flags separadas e controles de interface. Limitações: download público direto sem OAuth, 75 MB, vídeo em memória, Página Facebook aprovada e possíveis campos de criativo adicionais. Timeout pode gerar resultado remoto incerto: conferir Meta antes de repetir. Nenhuma ativação automática.

**Próximo aceite:** confirmar deploy/migration 013; testar upload 5A e anúncio 5B; conferir IDs/status PAUSED e persistência após recarga; regressão e revisão de segurança. Documentação: docs/RETOMADA.md, docs/BACKLOG.md e docs/FASE_5_VIDEO_ANUNCIO.md.

---

## 25/10/2026 — META04.1 validada em produção; META04.2A em revisão

**Aceite operacional confirmado por screenshot:** a conta Alps criou a campanha real **Teste Integracao API** (ID Meta `120249780034580576`), objetivo OUTCOME_ENGAGEMENT, status PAUSED, sem conjunto, anúncio ou orçamento. Após corrigir erro 100/subcódigo 4834011 com `is_adset_budget_sharing_enabled=false`, a API retornou ID e a lista passou de uma para duas campanhas. O operador confirmou visualmente. Flag `META_CAMPAIGN_CREATION_ENABLED=true` no serviço da aplicação. O token não foi exposto.

**META04.2A (PR em revisão):** formulário para planejar conjunto de anúncios em campanha pausada existente, com nome, idades 18–65, país Brasil e orçamento diário em reais. Endpoint `POST /api/companies/:companyId/meta-adset-preview` apenas valida e devolve prévia; **não chama a Meta, não cria conjunto e não gera gasto**. Ainda não valida a existência/status da campanha na Meta durante o POST; a lista do formulário é obtida da Meta. O orçamento é simulado, não garantido como aceito pela Meta. META04.2B deverá tratar objetivo/otimização/destino, programação, posicionamentos, idempotência persistente e confirmação explícita antes da primeira escrita de conjunto. Sem testes de produção da META04.2A.

## 24/10/2026 — META04.1 (PR em revisão)

Criação explícita de campanha OUTCOME_ENGAGEMENT com status PAUSED via Marketing API, sem conjunto, criativo ou orçamento. Endpoint POST /api/companies/:companyId/meta-create-campaign, autorização de owner/admin por clínica, confirmação no navegador, flag de segurança META_CAMPAIGN_CREATION_ENABLED=true no Railway (desabilitada por padrão), token apenas no servidor. Repetição de mesma chave protegida apenas em memória no processo (não é idempotência durável entre reinícios/instâncias); respostas incertas exigem conferir lista antes de repetir. Não testar criação sem autorização do operador. Produção ainda não validada.

## 24/10/2026 — META03.2: indicadores de desempenho (PR em revisão)

Consulta read-only ao Insights da conta de anúncios, com filtros hoje, 7 dias, 30 dias e intervalo personalizado (máximo 366 dias). Indicadores: gasto, alcance, impressões, cliques, cliques no link, CPC calculado e evento de conversas iniciadas quando retornado. Fonte e datas mostradas no painel; token exclusivo no servidor; nenhuma alteração de anúncios. Teste real em produção ainda pendente. Limitações: agregação no nível da conta, sem breakdown por campanha, atribuição conforme Meta, evento de conversas pode não estar disponível.

## 24/10/2026 — META03.1: campanhas, conjuntos e anúncios

Implementação em PR: três abas na tela de campanhas reais, consulta somente leitura por clínica a /campaigns, /adsets e /ads da Graph API, tradução de status/objetivos, resumo de regiões, orçamento, programação e referência ao criativo. Não altera Meta, não publica anúncios e não expõe token. Primeiros 100 itens por nível; paginação e métricas permanecem pendentes. Teste em produção após merge/deploy ainda necessário.

## 24/10/2026 — META02 validada e META03 em implementação

**META02:** PR #2 integrado e deploy Railway confirmado pelo operador. Teste real no Chrome autenticado retornou HTTP 200 e `{ connected: true, account: {...} }` para Alps Oral Clinic. Isso confirma consulta à conta de anúncios via Graph API usando `META_ACCESS_TOKEN` armazenado no servidor. Não comprova permissões de publicação nem valida acesso à página Facebook.

**META03 (PR em revisão, teste operacional pendente):** novo endpoint somente leitura `GET /api/companies/:companyId/meta-campaigns`, com autenticação e autorização por clínica, consulta Graph API `act_{ad_account_id}/campaigns`, limite de 100 resultados, timeout e erros sanitizados. Nova tela `/meta-campaigns.html` acessível em Integrações, com nome, objetivo, status e orçamentos informados pela Meta. A tela diferencia ausência de orçamento na campanha (pode existir no conjunto) e indica quando há mais de 100 campanhas. Sem migrations, novas dependências ou operações de escrita. A lista de campanhas ainda precisa de teste real no Railway após merge/deploy. Próximos passos: validar a lista, paginação, métricas e controle de publicação em fases separadas.

# Release notes — Meta Ads AI

## 24/10/2026 — META01: inventário de ativos Meta por clínica

PR [#1](https://github.com/matioly/meta_ads_ai/pull/1) incorporado à main pelo operador. Migration 007 cria `meta_assets`, com IDs do portfólio, conta de anúncios, Instagram, página Facebook, WABA, telefone e observações. API GET/PUT protegida por sessão, escopo da clínica e permissões; formulário em `/meta-assets.html` com acesso pelo painel Integrações.

**Aceite manual relatado:** deploy Railway carregou a página; cadastro Alps foi salvo e registro conferido no PostgreSQL (`whatsapp_business_id`, `whatsapp_phone`, `notes`, `updated_at` visíveis). Testes automatizados META01 e checagem de todos os IDs não realizados. Acesso à página Facebook segue pendente. Nenhuma conexão à Marketing API, upload à Meta ou publicação foi implementada.

Também confirmado pelo operador: L01 cadastrou vídeo Pamela ADS2 no banco e permitiu vinculá-lo a um rascunho. Próximo passo META02 (conexão segura, somente leitura).


## 24/10/2026 — Biblioteca de links do Google Drive (L01)

Implementados cadastro/edição/exclusão de contas identificadas por apelido e e-mail opcional, biblioteca de vídeos/imagens por clínica e vínculo opcional de uma mídia ao rascunho. Botão Abrir no Drive; membros consultam, owner/admin gerenciam.

Migration 006 cria drive_accounts e media, adiciona campaigns.media_id e chaves compostas para isolamento por clínica. Não há upload próprio, OAuth Google, download ou alteração de arquivos externos. M01 de bucket/upload foi adiado por decisão de aproveitar o Drive existente.

Validação de links HTTPS do Drive com normalização e preservação de resourcekey; duplicidades retornam 409. Registros vinculados não podem ser excluídos. PUT de campanha sem mediaId preserva vínculo; null remove.

Seis testes unitários de validação e autorização agora versionados e executáveis por npm test. Migrations 001–006 e rotas testadas em PostgreSQL embarcado PGlite, com autenticação simulada: permissões, duplicidade, FK entre clínicas, bloqueio de exclusão e compatibilidade passaram. Essa execução não substitui teste no PostgreSQL do Railway nem verifica sessão real de produção.

Fluxos de cadastro de contas e mídias, vínculo de campanha, novo rascunho sem mídia herdada, troca de clínica e consulta member passaram em DOM simulado (jsdom), com chamadas à API de teste. Não houve validação visual em navegador real; o navegador de teste não pôde ser instalado neste ambiente.

Aceite operacional no Railway pendente. Próximo passo: confirmar biblioteca e planejar acesso autorizado ao Drive para automação.


## 24/10/2026 — Briefing opcional de campanha (B01)

Commit funcional: [8860d6e](https://github.com/matioly/meta_ads_ai/commit/8860d6e4867b565c53d4c2c9c2ece22bb49d7e13).

### Implementado

- Sete campos opcionais: serviço, oferta, público, região, mensagem, destino e observações.
- Migration 005_campaign_briefing.sql: coluna JSONB não nula, padrão {} e restrição para objeto. Rascunhos anteriores permanecem válidos.
- src/briefing.js valida tipos, tamanho e chaves permitidas; remove espaços externos.
- GET devolve briefing; POST grava; PUT atualiza. Sem a propriedade no PUT, o conteúdo anterior é preservado.
- Objeto enviado substitui integralmente o briefing: campos internos omitidos ficam vazios; {} limpa o conteúdo.
- Seção expansível no formulário, reaproveitada para criação/edição.
- Membros podem abrir Ver em modo de consulta; responsáveis e administradores mantêm edição.
- Nenhuma dependência ou variável de ambiente adicional; nenhuma publicação no Meta.

### Verificações e pendências

Código conferido no GitHub, incluindo SQL, rotas, HTML, CSS e JavaScript. node --check passou para src/briefing.js, src/campaigns.js e public/app.js. Testes isolados do validador passaram para ausência de briefing, strings normalizadas, campos vazios, limites, tipos inválidos e chaves desconhecidas.

Esses testes foram executados fora da suíte do repositório e não constituem teste de integração. Aplicação da migration no Railway e teste ponta a ponta do briefing ainda não foram verificados nesta atualização. Não registrar B01 como homologado até confirmar o roteiro em docs/OPERACAO.md.

### Próximo passo

Concluir aceite operacional B01 e avançar para M01: upload e biblioteca de mídia por clínica. Provedor de armazenamento e limites ainda serão definidos.


## Marco funcional de 24/10/2026 — painel autenticado e rascunhos persistentes

Código de referência: [0cd2c6d](https://github.com/matioly/meta_ads_ai/commit/0cd2c6d1972ae8424fec1ca4e29bc9dbb57499ab).

Este registro consolida as entregas do primeiro ciclo. A numeração 1.0.0 em package.json permanece como inicial do pacote; este documento não cria uma tag ou GitHub Release.

### Resultado para o usuário

O usuário consegue entrar com e-mail/senha, selecionar uma clínica vinculada, criar um rascunho, buscar, editar seus dados e excluí-lo. Os dados são persistidos no PostgreSQL e sobrevivem à atualização da página e a novos logins. O painel mantém o layout aprovado.

Cada rascunho possui nome, objetivo e orçamento diário planejado. Indicadores mostram quantidade e soma do orçamento da clínica selecionada. Não existem publicação de anúncios, métricas Meta ou geração de IA neste marco.

### Entregas por etapa

1. **Fundação:** repositório próprio, package.json, gitignore, servidor Express, modo watch local, health check e deploy Railway.
2. **Banco:** pool PostgreSQL, /health/db e migrations transacionais com controle por nome.
3. **Modelo de acesso:** users, companies e company_members com owner/admin/member.
4. **Interface inicial:** visão geral, campanhas, integrações, modal, busca e indicadores. A primeira versão guardava rascunhos somente em memória do navegador.
5. **Autenticação:** login, bcrypt, sessões PostgreSQL, logout, perfil e proteção das páginas/APIs; bootstrap do usuário inicial e das duas clínicas.
6. **Correções da implantação:** bootstrap funcional, configuração inicial validada e criação efetiva da tabela de sessões.
7. **Persistência de campanhas:** migration 004, módulo campaigns, criação/listagem/exclusão por clínica, validação e permissões no servidor.
8. **Edição:** PUT por campanha e clínica, botão Editar e reaproveitamento do modal. Nova campanha reinicia o formulário e não sobrescreve a edição anterior.
9. **Documentação:** README, arquitetura, operação, backlog e guia de retomada adicionados após a validação manual da edição.

### Histórico de commits funcionais

Todos os commits abaixo são de 24/10/2026. Ordem do primeiro ao mais recente.

| Commit | Mensagem |
|---|---|
| [9d8dc8c](https://github.com/matioly/meta_ads_ai/commit/9d8dc8cc079caf2f7c348cfc54e8a2ea511373a7) | chore: inicia projeto meta_ads_ai |
| [18ee21c](https://github.com/matioly/meta_ads_ai/commit/18ee21c668c509a5eb503f8ed81b840314f04310) | feat: adiciona servidor inicial e health check |
| [4d88fc3](https://github.com/matioly/meta_ads_ai/commit/4d88fc34a11dba01926630b4c3c1e61b1f8de58f) | feat: conecta PostgreSQL e adiciona verificacao do banco |
| [0b728e2](https://github.com/matioly/meta_ads_ai/commit/0b728e2b42c41de3f0f2b5fec8722c08019a0e6c) | feat: cria tabelas de usuarios empresas e permissoes |
| [ae92aac](https://github.com/matioly/meta_ads_ai/commit/ae92aacb0d7413af7d45be9e54cc54aba9219a73) | feat: adiciona painel inicial com rascunhos de campanhas |
| [eb92727](https://github.com/matioly/meta_ads_ai/commit/eb9272789d57cc291073b463a3683efe8bb38be7) | feat: adiciona login sessoes e usuario inicial |
| [ad261cd](https://github.com/matioly/meta_ads_ai/commit/ad261cd79b12e87ffeafa09962df4589bae241fb) | fix: adiciona implementacao do bootstrap |
| [cff3427](https://github.com/matioly/meta_ads_ai/commit/cff3427983b77a422161b1428fd1aa8113ac5e07) | fix: cria tabela de sessoes ausente |
| [df65fa6](https://github.com/matioly/meta_ads_ai/commit/df65fa6750f19f1e3264a5da5cbbe3f09617e240) | feat: salva rascunhos de campanhas por clinica |
| [0cd2c6d](https://github.com/matioly/meta_ads_ai/commit/0cd2c6d1972ae8424fec1ca4e29bc9dbb57499ab) | feat: permite editar rascunhos de campanhas |

### Incidentes resolvidos e aprendizado

| Problema observado | Correção e observação |
|---|---|
| users não existia ao consultar | Configuração/execução de migrations foi conferida; logs posteriores confirmaram 001 aplicada |
| Build concluído, mas health check falhava | Servidor falhava antes de escutar a porta; investigar execução, não só build |
| bootstrap is not a function | Commit ad261cd adicionou a implementação/exportação do bootstrap |
| BOOTSTRAP_CONFIG_INVALID | Configuração inicial corrigida até o log de usuário inicial concluído; sem guardar valores secretos |
| Login falhava com relation user_sessions does not exist | 002_sessions.sql estava vazia; migration corretiva 003 criou a tabela exigida por connect-pg-simple |
| Rascunhos desapareciam ao atualizar | Persistência PostgreSQL com 004 e rotas de campanhas |
| Necessidade de excluir para alterar campanha | Edição via PUT e modal preenchido |

O erro pg_stat_statements em consultas railway:dataui apareceu nos logs do PostgreSQL. Não era a tabela usada pelo login; nenhuma correção dessa extensão foi implementada como parte do produto.

Avisos LF/CRLF do Git e npm sobre production não impediram os commits/deploys relatados. dotenv com zero entradas em .env é compatível com variáveis já fornecidas pelo ambiente.

### Validação e grau de evidência

- **Confirmado pelo operador na conversa:** página inicial abriu e layout aprovado; endpoint de banco conectado; login, logout e novo login; persistência dos rascunhos; etapa de edição testada.
- **Conferido no repositório:** implementação das rotas e dos controles, estrutura de banco, scripts e configuração Railway presentes no commit de referência.
- **Histórico de verificações:** comandos node --check utilizados; na etapa anterior foram relatadas verificações isoladas da lógica de rotas com banco simulado. Essas verificações não estão versionadas como suíte do projeto.
- **Não realizado por esta atualização documental:** novo teste ponta a ponta no Railway, inspeção das variáveis reais, auditoria de segurança, restauração de backup ou teste com Meta/IA.
- **Limite atual:** npm test ainda contém o placeholder padrão com saída de erro. Não existe pipeline de testes versionado na árvore revisada.

A confirmação manual das etapas não deve ser interpretada como cobertura de todos os cenários negativos de autorização, concorrência e falhas externas.

### Compatibilidade e operação

- Nenhuma dependência adicional, alteração de código funcional ou migration nesta atualização documental.
- Para reproduzir o banco, executar a sequência 001–004 pelo runner, incluindo a 002 histórica vazia.
- Preservar migrations já aplicadas; correções futuras usam novo arquivo.
- A edição não muda o ID, a clínica, a data de criação ou o autor inicial.
- Exclusão de rascunhos é física. Não há recuperação pelo painel.
- A aplicação ainda não possui alteração de senha, convites, upload, auditoria completa ou sincronização externa.

### Próximo marco proposto

Briefing completo por campanha, seguido de mídia e integrações graduais. Ver prioridades, dependências e aceite em [BACKLOG](docs/BACKLOG.md), e o ponto exato de continuidade em [RETOMADA](docs/RETOMADA.md).

## Como registrar futuras entregas

Adicionar seção com data, commit/PR, problema resolvido, comportamento novo, alterações de banco/configuração, testes executados, limitações e próximo passo. Não substituir o histórico anterior. Usar versão formal somente quando houver decisão de versionamento e tag correspondente.

