# Cadastro de clínicas, usuários e permissões — 25/10/2026

## Contexto

O sistema é multiempresa: uma clínica/negócio corresponde a uma linha em `companies`. Uma pessoa corresponde a `users`. A relação `company_members` associa pessoa a clínica com papel. O cadastro novo foi incluído no PR #55, sem necessidade de migrations novas: reaproveita tabelas existentes.

## Interface

Abrir `/meta-assets.html` (Contas e ativos Meta) autenticado. A página conserva menu esquerdo e topbar. O seletor de clínica do shell `#company` sincroniza com `#meta-company`; o formulário de administração é implementado em `public/workspace-admin.js`, estilos em `public/settings.css`. Formulário de clínica: nome, cidade e UF. Formulário de usuário: nome, e-mail, senha inicial e papel (administrador ou visualizador). A lista de usuários com acesso à clínica é exibida separadamente dos formulários; exibe nome, e-mail e papel, inclusive proprietário. Há placeholders e espaçamento atualizados.

Após criar uma clínica, a mensagem solicita atualizar a página para selecioná-la e configurar ativos. Não há seleção automática da nova clínica nesta versão.

## API implementada (todas autenticadas via sessão)

### POST /api/workspaces

JSON: `{"name":"Clínica Exemplo","city":"Campinas","state":"SP"}`.

- Exige que o usuário seja owner de **pelo menos uma** clínica já existente; essa regra permite que o proprietário expanda o número de espaços.
- `name` obrigatório, até 120 caracteres; `city` obrigatório, até 120; `state` duas letras A–Z, normalizadas em maiúsculas. Nota: schema original da tabela permite nome até 160; API é mais restritiva.
- Transação: insere em `companies` e vincula o usuário em `company_members` como `owner`; retorna HTTP 201 com `company`. Em falha, rollback.
- Não cria automaticamente IDs/contas Meta, tokens ou campanhas para a nova clínica.

### GET /api/workspaces/:companyId/users

- Valida UUID da clínica; exige que solicitante tenha qualquer vínculo com ela.
- Lista `id,name,email,role` dos membros da clínica ordenados por nome; não devolve hash de senha.
- HTTP 400 UUID inválido, 403 sem vínculo.

### POST /api/workspaces/:companyId/users

JSON: `{"name":"Ana Souza","email":"ana@example.com","password":"uma-senha-forte","role":"viewer"}`.

- Somente `owner` da clínica selecionada. `admin` não pode criar usuários.
- Nome obrigatório até 120; e-mail até 254, normalizado em minúsculas e validado; senha entre **12 caracteres e 72 bytes UTF-8**; papel `admin` ou `viewer`.
- Hash bcrypt custo 12 no servidor; transação insere `users` e `company_members`; HTTP 201 retorna `id,name,email,role`, sem senha/hash.
- E-mail já cadastrado retorna **409**: nesta etapa não é possível associar um usuário preexistente a outra clínica. Não duplicar usuário nem contornar restrição.
- `viewer` pode ler recursos autorizados mas não criar/alterar/excluir campanhas e mídias; `admin` pode escrever nas rotas que usam `company-access.js`; `owner` administra usuários e clínicas.

## Atenção ao modelo de papéis

O schema histórico e documentos antigos citam `member`; a nova UI e endpoint criam `viewer`. Confirmar as restrições efetivas da migration de `company_members` antes de cadastrar usuário viewer em produção: a API pode aceitar `viewer`, mas um CHECK SQL antigo pode rejeitar. **Esse ponto exige teste real e, se necessário, migration corretiva**. O middleware `company-access.js` permite leitura a qualquer membro e escrita somente a owner/admin, portanto o papel viewer funciona logicamente se persistido. Documentar explicitamente essa diferença e não afirmar que o cadastro viewer foi homologado.

## Segurança e isolamento

- `src/server.js`: `requireLogin` em `/api` e verificação de Origin/Content-Type em escritas; cookie de sessão httpOnly, secure em produção, sameSite=lax.
- `src/workspace-admin.js`: consulta papel no banco, não confia em papel enviado para atribuir owner.
- Senha nunca deve ser registrada em docs, logs, prints ou mensagens.
- O vínculo é por clínica: owner de uma não obtém acesso a outras sem associação.
- Validar concorrência/duplicação de e-mail e tratamento de erros antes de disponibilizar cadastro a operadores não técnicos.

## O que ainda NÃO existe

Convites por e-mail, associação de usuário existente a outra clínica, edição de perfil, recuperação/troca de senha, exclusão/desativação de usuários, transferência de propriedade, alteração de papel, auditoria administrativa e política de offboarding. Não prometer essas funções na interface.

## Testes de aceite

1. Owner logado cria clínica de teste; HTTP 201; ela aparece após recarga; vínculo owner confirmado.
2. Owner cria admin novo com e-mail único; login do novo usuário; acesso apenas à clínica vinculada; escrita permitida onde apropriado.
3. Owner cria viewer novo; login; leitura permitida; tentativas de POST/PUT/DELETE retornam 403. **Verificar CHECK do banco antes**.
4. Admin tenta criar usuário: 403. Usuário sem vínculo tenta listar usuários de outra clínica: 403.
5. E-mail repetido: 409. Nome/cidade/UF/senha/e-mail inválidos: 400. Não aceitar senha fraca.
6. Troca de clínica atualiza lista de membros; logout/login preservam dados.

Implementação documentada, mas **não foi executado teste end-to-end em produção nesta atualização**.
