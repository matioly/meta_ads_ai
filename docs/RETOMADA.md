> **PONTO DE RETOMADA MAIS RECENTE (25/10/2026, após PR #62):** iniciar por [GUIA_DE_RETOMADA_2026-10-25.md](GUIA_DE_RETOMADA_2026-10-25.md), [TELAS_E_NAVEGACAO.md](TELAS_E_NAVEGACAO.md) e [CADASTRO_CLINICAS_USUARIOS.md](CADASTRO_CLINICAS_USUARIOS.md). PRs #55–#62: cadastro de clínica/usuário, dashboard real de 30 dias, integração e biblioteca modernizadas, sidebar consistente, hotfixes de inicialização e mitigação de flash de Campanhas. **Flash após #62 ainda não homologado.** Bug funcional confirmado: viewer não é aceito pelo CHECK SQL original. O operador já confirmou criação de anúncio PAUSADO com ID Meta em etapa anterior; os trechos antigos que dizem “5B não homologado” representam estados anteriores, não o marco atual.

# ESTADO PRIORITÁRIO — 25/10/2026

Esta atualização prevalece sobre o histórico abaixo. Repositório matioly/meta_ads_ai; Railway com Node.js/Express/PostgreSQL; projeto separado do bot WhatsApp assistente_alps.

## Entregas e testes

- META01: inventário da Alps persistido; Página Facebook 105234548794783 teve solicitação de acesso pendente, confirmar estado atual antes de criar criativos.
- META02: token exclusivo META_ACCESS_TOKEN no serviço meta_ads_ai do Railway; conexão Marketing API validada. Não divulgar segredo.
- META03: consultas de campanhas, conjuntos, anúncios e indicadores implementadas. Conferência integral de métricas ainda pendente.
- META04.1: campanha Teste Integracao API ID 120249780034580576 criada PAUSADA no painel. Correção de erro Meta 100/4834011: is_adset_budget_sharing_enabled=false.
- META04.2: conjunto 25-55 ID 120249780122340576 criado PAUSADO, vinculado à campanha Teste Meta 2B ID 120249780051470576, conforme print do operador. Erros enfrentados: 100/1815715 destination_type incompatível, 100/2490487 estratégia/ROAS/otimização, 100/1870227 Advantage+ audience. Não extrapolar a correção para outros objetivos.
- META04.3: vídeo Pamela ADS2, conta Google Drive apelidada Matioly, usado em rascunho; operador confirmou que salvou e recuperou TODOS os campos após recarregar. Tabela creative_drafts, migration 012.
- META05A/5B: PR #20 criou migration 013_meta_video_ads.sql, endpoints para upload do vídeo Google Drive e criação de criativo/anúncio PAUSADO, com confirmação humana, flags e IDs persistidos. **Implementação no GitHub; upload real e anúncio ainda NÃO HOMOLOGADOS.**

## Próximos passos exatos

1. Conferir PR #20 incorporado à main, deploy Railway saudável e logs com migration 013 aplicada ou já aplicada; pre-deploy deve executar npm run db:migrate.
2. Verificar variáveis META_VIDEO_UPLOAD_ENABLED=true e META_PAUSED_AD_CREATION_ENABLED=true somente quando for testar, no serviço meta_ads_ai, não no bot; token Meta somente no ambiente seguro.
3. Abrir /meta-campaigns.html, selecionar Alps e o rascunho salvo na etapa 3, conferir vínculos de campanha/conjunto. Clicar 5A com confirmação manual. Google Drive deve permitir download direto sem login; limite inicial 75 MB, sem OAuth.
4. Conferir videoId e vídeo na Meta. Em timeout ou resultado incerto, verificar a biblioteca Meta antes de tentar novamente para evitar duplicata.
5. Para 5B, conferir Página Facebook aprovada e compatibilidade de objetivo/destino/CTA. Criar com confirmação e verificar status PAUSED no Gerenciador; nenhum anúncio será ativado automaticamente.
6. Recarregar e conferir IDs persistidos, atualizar changelog com resultado e regressão de login, rascunhos e consultas.

## Arquitetura de referência

Servidor: src/server.js; consultas src/meta-campaigns.js e src/meta-insights.js; criação controlada src/meta-create-campaign.js e src/meta-create-adset.js; rascunhos src/creative-drafts.js; fase 5 src/meta-video-ads.js; UI public/meta-campaigns.html, public/meta-creative-plan.js, public/meta-video-ads.js; banco migrations 012 e 013. Sessão e autorização por clínica, origem de escrita verificada, token só no backend. Revisar papéis owner/admin nas novas rotas antes de dar acesso à equipe.

## Riscos e backlog

P0: homologar deploy/migration 013, upload 5A e anúncio PAUSADO 5B, resolver Página Facebook, checar controle de papéis e evitar duplicações após timeout. P1: Google OAuth para arquivos privados em várias contas, upload streaming para vídeos maiores, CTA/thumbnail/destino compatíveis, idempotência durável, histórico. P2: prévia realista, revisão editorial odontológica, aprovação/ativação manual separada, IA de copy, relatórios e expansão multiempresa. Não automatizar investimento.

---

## Estado confirmado em 25/10/2026 — META04.1 concluída

Alps Oral Clinic: primeira campanha criada pelo próprio painel na Marketing API: **Teste Integracao API**, ID `120249780034580576`, objetivo Engajamento, status PAUSED. Screenshot confirma retorno de sucesso e duas campanhas listadas. Sem conjuntos/anúncios na nova campanha e sem orçamento. Erro Meta 100/4834011 resolvido ao enviar `is_adset_budget_sharing_enabled=false`. O painel passou a exibir código, subcódigo e descrição sanitizada dos erros Meta. A variável `META_CAMPAIGN_CREATION_ENABLED=true` foi corrigida no Railway (nome deve terminar com ENABLED). A proteção de idempotência da criação de campanhas é apenas em memória, portanto não repetir chamadas após resultado incerto.

**Próximo incremento META04.2A (PR em revisão):** simulação de conjunto na tela `/meta-campaigns.html`. Seleciona campanha pausada, nome, idade mínima/máxima, Brasil e orçamento diário. O POST `/api/companies/:companyId/meta-adset-preview` não chama a Meta e não cria nada. Após merge/deploy, selecionar a campanha de teste e clicar **Revisar configuração (sem criar)**. Verificar resposta e ausência de novo conjunto na aba Conjuntos. META04.2B implementará criação pausada após validar requisitos da Meta para otimização/destino/posicionamento e autorização explícita. Nenhum segredo deve ser colocado em commits ou capturas de tela.

## META04.1 — primeiro teste de criação controlada

PR META04.1 adiciona formulário em /meta-campaigns.html para criar campanha real de Engajamento com status PAUSED, sem conjunto/anúncio/orçamento. A API exige usuário owner/admin, chave de requisição e confirmação. Flag META_CAMPAIGN_CREATION_ENABLED deve estar 'true' no serviço meta_ads_ai do Railway para permitir POST; por padrão, escrita desabilitada. Após merge/deploy, primeiro confirmar que a flag impede criação, depois ativar somente com consentimento do operador e criar uma campanha de teste pausada. Verificar ID retornado e lista de campanhas. Nunca repetir às cegas após erro incerto, pois proteção de repetição é somente em memória.

## META03.2 — validação pendente

PR META03.2 adiciona endpoint GET /api/companies/:companyId/meta-insights e cards na página /meta-campaigns.html. Testar no Railway após merge/deploy com Alps: 7 dias, 30 dias, hoje e intervalo personalizado. Comparar gastos, alcance e cliques com Gerenciador de Anúncios no mesmo período/fuso. Ausência do evento de conversa é exibida como indisponível, não zero. Nenhum anúncio é alterado. META03.1 já validada manualmente pelo operador: 1 campanha, 1 conjunto com R$30/dia e 5 anúncios.

## META03.1 — próximo teste operacional

PR META03.1 implementa abas Campanhas, Conjuntos e Anúncios em /meta-campaigns.html, com status/objetivos traduzidos e consulta read-only. Depois de merge/deploy, conferir três abas na Alps, comparando com Gerenciador de Anúncios. O acesso a criativos ou campos de segmentação pode variar conforme permissões; erro da API será mostrado sem revelar token. Não há paginação nem métricas de desempenho nesta etapa.

## Estado atual — META02 validada / META03 aguardando deploy

Em 24/10/2026, o operador confirmou merge e deploy do PR #2; chamada autenticada `GET /api/companies/:companyId/meta-connection` retornou HTTP 200 e `connected: true` para Alps. Token exclusivo `META_ACCESS_TOKEN` configurado no serviço meta_ads_ai do Railway; nunca expor em logs, prints, commits ou frontend. Não alterar o bot de WhatsApp.

META03 implementa a primeira consulta de campanhas existentes, somente leitura, em `/meta-campaigns.html` e `GET /api/companies/:companyId/meta-campaigns`. Após merge e deploy, entrar no painel, selecionar Alps, ir a Integrações → Consultar campanhas reais e conferir dados com o Gerenciador de Anúncios. Teste de produção META03 ainda pendente. Exibe até 100 registros, sem paginação. Não cria, edita, pausa nem publica anúncios; não fornece métricas de performance.

# Retomada do projeto

Atualizado em 24/10/2026. Código de referência: 8860d6e.

## Atualização operacional — 24/10/2026: META01 concluída

**Estado mais recente:** META01 entregue pelo PR [#1](https://github.com/matioly/meta_ads_ai/pull/1), merge feito pelo operador, deploy Railway confirmado visualmente e gravação na tabela `meta_assets` confirmada por print. Tela `/meta-assets.html` carregou e mostrou “Inventário carregado”; após salvar, a tabela apresentou WABA, telefone, observações e horário de atualização. Não foram executados testes automatizados específicos da META01 nem auditoria de segurança.

**Inventário piloto Alps Oral Clinic (IDs informados a partir das telas Meta):**
- Portfólio empresarial: `1101618809710897` (conferir no painel Meta antes de depender dele: transcrição manual).
- Conta de anúncios: `4017397088397476` (API usa `act_4017397088397476`).
- Instagram: `@alpsoralclinic`; ID `17841450939932628`.
- Página Facebook: `105234548794783`; **acesso solicitado, ainda pendente**. Usuário decidiu resolver depois.
- WABA: `28627247860246737`; telefone comercial cadastrado. `phone_number_id` não foi levantado.
- O inventário é cadastro manual; IDs e permissões não são verificados pela Meta API.

**Biblioteca L01:** operador confirmou registro `Pamela ADS2` na tabela `media` e associação a um rascunho. São links/metadados Google Drive, não upload ao Railway/Meta.

**Próximo incremento acordado: META02.** Primeiro conferir token disponível e permissões para Marketing API (pode ser token do bot de WhatsApp), definir credenciais exclusivamente no servidor, vínculo por clínica e botão de teste somente leitura. Não adicionar token ao GitHub, não publicar campanhas e não criar gastos. Verificar documentação atual da Meta antes de implementar. Depois META03 consulta de campanhas.

**Para retomar:** ler README, esta atualização, BACKLOG e OPERACAO; conferir branch main e migrations 006/007 no Railway. Preservar fluxo atual e página pendente. A seção histórica abaixo descreve o estado anterior à META01 e não substitui esta atualização.

## Último incremento: biblioteca do Drive

Implementada biblioteca de links com cadastro de contas por apelido/e-mail, vídeos/imagens por clínica e uma mídia opcional por campanha. Migration nova: 006_drive_library.sql. Não criar bucket nem solicitar senha Google: esta etapa guarda apenas metadados e links. Detalhes em BIBLIOTECA_DRIVE.md. Aceite no Railway pendente.

## Histórico anterior

O painel permite fazer login, escolher a clínica e criar, consultar, editar e excluir rascunhos persistidos no PostgreSQL. Evandro confirmou os testes manuais após as entregas de persistência e edição. O último incremento funcional é **briefing opcional de campanha**, versionado em 8860d6e, com a migration 005. Sintaxe e validação isolada foram verificadas; o teste ponta a ponta específico do briefing no Railway ainda precisa ser registrado.

Esta atualização registra a documentação. Não adiciona integração Meta, IA, publicação, novos endpoints ou migrations.

## Contexto e decisões já tomadas

- Projeto separado: matioly/meta_ads_ai; não é o repositório do bot de WhatsApp.
- Manter Railway como hospedagem, com PostgreSQL.
- Painel próprio, com estrutura para mais de uma clínica/negócio.
- Sorriso de Campinas e Alps Oral Clinic são as clínicas criadas no bootstrap.
- HTML/CSS/JS sem framework foi suficiente para a primeira fase; layout aprovado pelo usuário.
- Desenvolvimento até aqui por arquivos no VS Code, verificações no terminal, commit/push e deploy no Railway.
- O usuário pretende enviar vídeos para futuros anúncios; armazenamento e upload ainda não existem.
- Evolução pretendida: planejamento, criação assistida, revisão, publicação controlada e métricas.
- Valores reais de senhas, tokens e conexões não devem entrar na documentação.

## Antes de continuar

1. Ler este arquivo e [BACKLOG](BACKLOG.md).
2. Conferir a branch e mudanças locais com git status.
3. Se a árvore estiver limpa, executar git pull --ff-only para receber também esta documentação.
4. Ler [CHANGELOG](../CHANGELOG.md) e o código dos arquivos que serão alterados.
5. Conferir se o último deploy está saudável e se o banco recebeu as migrations.
6. Executar um fluxo curto: login, escolher clínica, criar rascunho de teste, editar, atualizar a página e excluir.
7. Implementar um incremento delimitado e atualizar os documentos ao terminar.

Se houver mudanças locais, preservá-las em commit ou stash antes de sincronizar. Não usar reset destrutivo para resolver divergência.

## Próximo incremento recomendado

Primeiro concluir o aceite operacional de **B01**: migration 005 aplicada, briefing salvo e recarregado, campos apagados persistindo vazios, rascunhos antigos funcionando e consulta por member sem escrita.

A decisão posterior foi usar os links de arquivos que a equipe já guarda em várias contas do Google Drive. A biblioteca e o vínculo estão implementados em L01. Confirmar seu funcionamento após a migration 006; depois definir o acesso autorizado ao Drive para futura transferência ao Meta (L02). Upload próprio M01 fica adiado.

O briefing já tem serviço, oferta, público, região, mensagem, destino e observações, todos opcionais. Não refazer essa feature. A API preserva o briefing se PUT não enviar a propriedade; se enviar, substitui o objeto inteiro.

A biblioteca atual usa Google Drive como origem dos links, sem conexão OAuth. A estratégia de acesso automático ainda será definida. Testes de autorização e prevenção de migrations vazias continuam no backlog técnico.

## Cuidados para não repetir problemas

- Salvar todos os arquivos no VS Code antes de git add; node --check aceita arquivo vazio.
- 002_sessions.sql continua vazio por histórico. A tabela real vem de 003_fix_user_sessions.sql.
- Não editar migration aplicada esperando que rode novamente: o executor verifica o nome em schema_migrations.
- O bootstrap precisa exportar a função; ele não é um comando de reset de senha.
- Alterar BOOTSTRAP_PASSWORD depois de existir usuário não muda a senha gravada.
- APP_URL precisa coincidir com a origem usada pelo navegador; escritas podem falhar se houver domínio diferente.
- Health check HTTP positivo não prova que sessões, tabelas e todos os fluxos estão corretos.
- Orçamento do painel é planejado. Não interpretar como gasto Meta.

## Texto para iniciar outra sessão de trabalho

> Continuar o projeto matioly/meta_ads_ai. Leia README.md, docs/RETOMADA.md, CHANGELOG.md, docs/ARQUITETURA.md e docs/BACKLOG.md e confira o código atual antes de alterar. Já temos Node/Express, PostgreSQL, deploy Railway, login com sessões e CRUD de rascunhos por clínica, inclusive edição. Meta Ads, mídia e IA ainda não estão integrados. Preservar o layout aprovado e o isolamento por clínica. Briefing opcional já implementado em 8860d6e com migration 005; confirmar seu aceite operacional. Biblioteca por links do Drive (L01) também já implementada, com migration 006. Confirmar o deploy e os testes operacionais; próximo passo proposto é acesso autorizado aos arquivos (L02). Não criar bucket sem nova decisão. Atualizar a documentação após a entrega e registrar o que foi efetivamente testado.

## Como manter este ponto de retomada

Ao parar, registrar data, último commit funcional, resultado dos testes, próximo item, decisões e bloqueios. Não marcar um item como entregue apenas porque foi proposto. Usar links de commits e distinguir teste manual relatado, teste automatizado e verificação de produção.

