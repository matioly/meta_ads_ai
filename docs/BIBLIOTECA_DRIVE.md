# Biblioteca de links do Google Drive

Implementação de 24/10/2026. Esta etapa organiza links; não conecta contas Google.

## Uso

1. Selecionar a clínica e abrir Mídias.
2. Cadastrar conta: apelido obrigatório de até 120 caracteres; e-mail opcional de até 254.
3. Cadastrar mídia: nome até 120, tipo vídeo/imagem, conta da clínica, link HTTPS de arquivo do Drive e observações até 500.
4. Abrir no Drive para conferir o arquivo com uma conta Google que tenha permissão.
5. Criar/editar campanha e escolher a mídia; salvar e recarregar para confirmar.

Várias contas podem ser identificadas por clínica. A mesma conta pode ser cadastrada em clínicas diferentes de forma independente. A seleção da clínica vem dos vínculos do usuário, não é um campo livre no cadastro.

## Limites e comportamento

- Senhas e tokens Google não são solicitados ou armazenados.
- Nome/e-mail da conta são anotações do operador; não comprovam propriedade.
- O servidor verifica o formato do link, mas não acessa nem valida o conteúdo remoto.
- Um link privado continua privado no Google; acesso no painel não concede acesso no Drive.
- Tipo de mídia é declarado; o sistema não inspeciona MIME, tamanho, duração ou resolução.
- Uma mídia por campanha nesta versão. A mesma mídia pode ser reutilizada em vários rascunhos.
- Alterar o link de um cadastro altera a referência usada pelos rascunhos vinculados a ele; não existe snapshot ou versionamento.
- Não é possível excluir conta com mídias nem mídia vinculada a campanhas. Remover ou trocar vínculos primeiro.
- Exclusão remove apenas o registro local. Arquivo Google nunca é apagado.
- Busca do painel continua sendo por nome/objetivo das campanhas; não há busca ou paginação específica da biblioteca nesta versão.
- Listas são carregadas com a clínica. Falha de carga bloqueia gravações até recarregar.

## Rotas e dados

Prefixo /api/companies/:companyId. /drive-accounts oferece GET/POST e /drive-accounts/:accountId PUT/DELETE. /media oferece GET/POST e /media/:mediaId PUT/DELETE.

Conta: label e email. Mídia: name, kind (video/image), accountId, url e notes. Retorno GET media inclui accountLabel e accountEmail para apresentação. Campanha retorna mediaId e aceita esse campo em POST/PUT. Propriedade omitida no PUT preserva a associação; null remove.

As tabelas drive_accounts e media possuem company_id. FKs compostas evitam vincular mídia à conta de outra clínica e campanha à mídia de outra clínica. Todas as rotas verificam company_members. Member consulta; owner/admin escrevem. Validação 400, sessão ausente 401, acesso negado 403, registro ausente 404 e conflito 409.

## Roteiro de aceite após deploy

- [ ] Migration 006 aplicada no ambiente correto.
- [ ] Rascunhos anteriores continuam abrindo sem mídia.
- [ ] Cadastrar duas contas com apelidos diferentes.
- [ ] Cadastrar vídeo e imagem, editar nome/observações e confirmar após recarga.
- [ ] Link de pasta/domínio diferente rejeitado; duplicidade de arquivo na clínica rejeitada.
- [ ] Abrir arquivo privado no Drive com a conta autorizada.
- [ ] Vincular mídia ao rascunho, recarregar e conferir.
- [ ] Remover vínculo e confirmar; nova campanha começa sem seleção herdada.
- [ ] Conta com mídia e mídia vinculada não podem ser excluídas.
- [ ] Member consulta sem criar, editar ou excluir.
- [ ] Outra clínica não exibe contas/mídias da anterior.
- [ ] Exclusão de cadastro sem vínculos não apaga o arquivo Google.

O próximo incremento proposto é acesso autorizado ao Drive (L02), com consentimento e tratamento de arquivos removidos/revogados. Esta documentação não declara integração Google/Meta concluída.

## Evidências de testes

Seis testes unitários versionados (npm test) passaram. Teste externo de integração com PGlite executou migrations 001–006 e validou APIs, permissões, duplicidade, bloqueio de exclusão vinculada e FK entre clínicas. Teste de DOM com jsdom validou cadastro e vínculo usando essas APIs. A sessão foi simulada nesse ambiente; não houve teste visual em navegador real ou execução no Railway.
