> **ATUALIZAÇÃO DE OPERAÇÃO — 25/10/2026:** Consulte [Guia principal](GUIA_DE_RETOMADA_2026-10-25.md) e [Telas/navegação](TELAS_E_NAVEGACAO.md). Após merge dos PRs #55–#62, confirmar deploy Railway e fazer recarga sem cache. Validar login/logout, menu lateral em todas as páginas, cadastro de clínica e usuário, biblioteca, Meta Insights e anúncio PAUSADO. **Bug confirmado no código:** o CHECK de `company_members.role` em `001_initial.sql` não admite `viewer`, embora a nova API admita; corrigir por migration antes de testar viewer. **Não executar scripts de criação/ativação em produção sem confirmação do operador.** Para segurança, verificar `META_ACCESS_TOKEN` somente no Railway e nunca copiar credenciais para docs. Os passos antigos abaixo são históricos.

# Operação e desenvolvimento

Referência: 24/10/2026. Configuração de código verificada até 8860d6e. O estado das variáveis e serviços no Railway não foi inspecionado nesta atualização; o histórico de deploy e testes foi informado pelo operador.

## META01 — deploy e aceite confirmado (24/10/2026)

- PR #1 integrado à main pelo operador; Railway serviu `/meta-assets.html`.
- Migration `007_meta_assets.sql` criou `meta_assets` (registro verificado no painel PostgreSQL).
- Formulário por clínica em Integrações; GET/PUT `/api/companies/:companyId/meta-assets`; gravação confirmada visualmente para Alps.
- Print do banco exibiu `whatsapp_business_id`, `whatsapp_phone`, `notes`, `updated_at`. Outros campos requerem conferência adicional se houver divergência.
- Sem necessidade de `META_ACCESS_TOKEN` para META01. Não criar credenciais até revisar META02.
- Pendência externa: acesso à página Facebook solicitado e não aprovado; **não bloquear inventário** por isso.
- Testes pendentes: leitura após F5, validação de entradas inválidas, perfil member, isolamento entre clínicas, regressão e testes automatizados com banco isolado.

Para conferir sem alterar dados: Railway → Postgres → Database → Data → `meta_assets`. Não usar botões Row/Column para verificar. Evitar copiar tokens, cookies ou URLs privadas em screenshots.

## Ambiente local

Usar Node compatível com Express 5 e node --watch. Os builds compartilhados usaram Node 24; o projeto ainda não fixa engines ou packageManager. Usar npm com package-lock.json.

1. Sincronizar o repositório sem perder alterações locais.
2. Criar um PostgreSQL de desenvolvimento separado.
3. Criar .env local, sem versioná-lo.
4. Instalar dependências, migrar e iniciar:

```sh
npm ci
npm run db:migrate
npm run dev
```

Não há etapa de build de frontend. npm start executa node src/server.js; npm run dev usa node --watch src/server.js.

## Variáveis

| Variável | Uso |
|---|---|
| DATABASE_URL | Obrigatória; conexão PostgreSQL do ambiente |
| SESSION_SECRET | Obrigatória; mínimo 32 caracteres; usar segredo aleatório persistente |
| APP_URL | Obrigatória; URL cuja origem deve coincidir com a do navegador |
| NODE_ENV | production no Railway para cookie seguro e exigência de HTTPS |
| PORT | Porta injetada pelo Railway; padrão local 3000 |
| BOOTSTRAP_NAME | Nome do primeiro usuário, obrigatório somente se users estiver vazia |
| BOOTSTRAP_EMAIL | E-mail válido do primeiro usuário; normalizado para minúsculas |
| BOOTSTRAP_PASSWORD | Senha inicial com pelo menos 12 caracteres e no máximo 72 bytes UTF-8 |

Exemplo apenas para desenvolvimento; substituir os marcadores por valores locais:

```dotenv
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://USUARIO:SENHA@localhost:5432/meta_ads_ai_dev
SESSION_SECRET=SUBSTITUA_POR_UM_SEGREDO_ALEATORIO
BOOTSTRAP_NAME=Administrador de desenvolvimento
BOOTSTRAP_EMAIL=admin@example.com
BOOTSTRAP_PASSWORD=SUBSTITUA_POR_UMA_SENHA_FORTE
```

Os marcadores não são credenciais utilizáveis. Para gerar SESSION_SECRET localmente:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Não publicar .env, conexão, senha ou tokens em commits, logs ou documentação.

## Bootstrap

Quando não há usuários, valida a configuração, calcula hash bcrypt de custo 12 e abre transação com advisory lock 7241902. Reconfere users dentro da transação, cria um usuário, Sorriso de Campinas e Alps Oral Clinic (Campinas/SP), vinculando-o como owner em ambas.

Se já existe qualquer usuário, retorna sem recriar ou atualizar os dados. As variáveis de bootstrap não servem para alterar senha, criar novos usuários ou reparar vínculos parcialmente removidos.

Depois de confirmar o login inicial, remover BOOTSTRAP_PASSWORD do serviço é recomendado; em banco já inicializado ela não é necessária. Manter SESSION_SECRET entre deploys. A remoção efetiva da senha do ambiente não foi verificada nesta documentação.

## Migrations

O executor:
1. Abre transação e adquire advisory lock 7241901.
2. Cria schema_migrations se necessário.
3. Lê arquivos no padrão numérico seguido de nome e extensão .sql, ordenados por nome.
4. Ignora nomes já registrados.
5. Executa SQL e registra o nome.
6. Confirma a transação; se falhar, faz rollback e encerra com erro.

| Arquivo | Resultado |
|---|---|
| 001_initial.sql | users, companies, company_members e índice |
| 002_sessions.sql | Histórico vazio, sem DDL |
| 003_fix_user_sessions.sql | user_sessions e índice de expiração |
| 004_campaigns.sql | campaigns e índice por clínica/data |
| 005_campaign_briefing.sql | campaigns.briefing JSONB; registros anteriores recebem {} |

Não apagar registros de schema_migrations nem reescrever migrations aplicadas para forçar reexecução. Criar nova migration corretiva. Não há ferramenta de rollback automático ou checksum.

O executor atual aceita arquivo vazio. Ao implementar validação contra vazios, considerar explicitamente a exceção histórica 002 em um banco novo; uma rejeição indiscriminada quebraria a instalação do zero.

Consultas de diagnóstico sem dados sensíveis:

```sql
SELECT name, applied_at
FROM schema_migrations
ORDER BY name;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Deploy Railway

Configuração versionada em railway.json:
- Pré-deploy: npm run db:migrate.
- Início: npm start.
- Health check: /health.

No histórico, foi necessário conferir os comandos também no painel Railway. Ao retomar, verificar o serviço da aplicação, a conexão do PostgreSQL e o deploy correspondente ao commit pretendido. Não confundir logs do banco com logs do processo Node.

Sequência esperada: instalação de dependências → migration → inicialização do Node → bootstrap → porta disponível → health check.

Logs esperados:
- Ja aplicada: ... ou Aplicada: ...
- Migrations concluidas.
- Usuario inicial ja configurado. ou Configuracao do usuario inicial concluida.
- Meta Ads AI iniciado na porta ...

dotenv informando zero variáveis de .env não significa ausência das variáveis injetadas pelo Railway.

## Verificação antes de enviar

Salvar todos os arquivos. Na raiz do projeto:

```sh
node --check src/server.js
node --check src/bootstrap.js
node --check src/campaigns.js
node --check src/briefing.js
node --check src/media.js
node --check src/media-validation.js
node --check src/company-access.js
node --check public/media-library.js
node --check src/migrate.js
node --check public/app.js
node --check public/login.js
git diff --check
git status
git diff --stat
```

Esses comandos verificam sintaxe/diff, não conexão, migrations ou comportamento. Conferir conteúdo de novos SQLs. npm test executa os testes unitários versionados de validação da biblioteca. A cobertura ainda não substitui testes de integração e autenticação.

Após selecionar os arquivos de uma entrega:
```sh
git diff --cached --stat
git diff --cached
git commit -m "feat: descreve a entrega"
git push
```

Evitar incluir .env ou arquivos não relacionados.

## Roteiro manual de regressão

| Cenário | Resultado esperado |
|---|---|
| Acessar / sem sessão | Redireciona a /login |
| Login válido e logout | Entra no painel e depois encerra sessão |
| Credencial inválida | Mensagem genérica, sem acesso |
| Selecionar clínica | Carrega somente seus rascunhos |
| Criar rascunho | Salva e atualiza indicadores |
| Recarregar e entrar novamente | Registro permanece |
| Editar nome/objetivo/orçamento | Mesmo registro atualizado; persiste após recarregar |
| Nova campanha após editar | Modal limpo; cria outro registro |
| Cancelar edição | Não grava alterações |
| Excluir e recarregar | Registro continua ausente |
| Buscar | Filtra por nome/objetivo |
| Trocar clínica | Não mostra registros da clínica anterior |
| Perfil member | Consulta permitida; escrita negada também pela API |
| Sem vínculo com clínica | API retorna 403 |
| UUID inválido | API retorna 400 |
| ID de campanha de outra clínica autorizada | UPDATE/DELETE não alteram registro fora da clínica da URL |
| Orçamento fora do limite | API rejeita |
| Sessão expirada | Frontend retorna ao login |

Testes negativos de permissões precisam de usuários/vínculos de teste em ambiente de desenvolvimento. Não realizar experimentos destrutivos em produção. Para chamadas manuais de escrita, respeitar cookie, Origin e JSON exigidos pelo servidor.

## Diagnóstico dos problemas já observados

| Sintoma | Causa/encaminhamento |
|---|---|
| Build conclui mas /health não fica disponível | Ver logs de execução: processo pode falhar antes de abrir porta |
| bootstrap is not a function | Implementação/exportação do bootstrap ausente no arquivo enviado; corrigida |
| BOOTSTRAP_CONFIG_INVALID | Em banco sem usuários, revisar nome, e-mail e limites da senha; corrigido na configuração durante a implantação |
| relation users does not exist | Conferir migrations e banco selecionado |
| relation user_sessions does not exist, 42P01 | 002 estava vazia; 003 criou a tabela esperada pelo session store |
| pg_stat_statements ausente em consulta railway:dataui | Erro observado em consulta de estatísticas do painel; não é a tabela de sessões nem parte do SQL da aplicação |
| Origem da solicitação não permitida | Comparar origem do navegador com APP_URL |
| Cookie não funciona localmente | Conferir NODE_ENV, HTTPS e uso consistente de localhost/host |
| LF será substituído por CRLF | Aviso de finais de linha do Git, não falha de commit |
| /health ok mas operações falham | Ver /health/db, migrations e logs; /health não consulta banco |

## Continuidade, backup e restauração

A aplicação não implementa backup próprio. Política de backup do PostgreSQL/Railway, retenção e restauração precisam ser verificadas e documentadas; não foram confirmadas aqui.

Reverter código não reverte banco. Antes de migrations destrutivas futuras, estabelecer backup verificado e plano de compatibilidade. Preferir correções incrementais. Registrar incidente, commit, migration e resultado da recuperação.

Para incorporar alterações de documentação feitas diretamente no GitHub, com árvore local limpa:

```sh
git pull --ff-only
```

## Verificação da entrega de briefing (005)

O commit 8860d6e contém código e migration. A presença no GitHub não confirma aplicação no banco Railway. Conferir o pré-deploy e a entrada 005_campaign_briefing.sql em schema_migrations.

1. Abrir rascunho anterior à migration; deve funcionar com briefing vazio.
2. Preencher os sete campos, salvar, atualizar e abrir de novo.
3. Apagar uma observação, salvar e conferir que permanece vazia.
4. Abrir Nova campanha após editar; não deve herdar o briefing anterior.
5. Trocar de clínica e confirmar a separação.
6. Usar member de teste: Ver deve permitir consulta sem edição; escrita direta na API deve retornar 403.
7. Em desenvolvimento, confirmar limites, tipos inválidos e chaves desconhecidas: resposta 400.
8. Em desenvolvimento, enviar PUT sem briefing: deve preservar o anterior. Enviar briefing {}: deve limpar os campos.

Sintaxe dos três JavaScripts envolvidos e testes isolados do validador passaram nesta atualização documental. Testes com PostgreSQL, navegador e Railway não foram executados por esta atualização. A confirmação operacional específica do briefing segue pendente.

Se ocorrer erro de coluna briefing ausente, verificar se a aplicação e o banco usam o mesmo ambiente e se a migration 005 foi executada. Não recriar tabela nem remover dados para resolver.

Nenhuma variável de ambiente ou dependência npm nova é necessária para esta entrega.


## Deploy da biblioteca Drive

Pré-deploy deve aplicar 006_drive_library.sql. Sem nova variável, serviço, bucket ou credencial Google. Não instalar as dependências usadas apenas no ambiente externo de integração: PGlite e Playwright não são dependências de produção.

Depois do deploy: abrir Mídias, cadastrar conta, cadastrar link, abrir no Drive com usuário autorizado, vincular ao rascunho, salvar e recarregar. Verificar modo member, troca de clínica e tentativa de excluir mídia vinculada (409). Excluir um cadastro livre deve manter o arquivo original no Drive. Roteiro completo em BIBLIOTECA_DRIVE.md.
