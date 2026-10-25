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

