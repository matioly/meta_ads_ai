# Meta Ads AI

Painel próprio para planejar campanhas de anúncios por clínica, com evolução prevista para integração ao Meta Ads e assistência de IA.

**Estado em 24/10/2026:** autenticação, rascunhos persistentes e briefing opcional implementados. O briefing está versionado; a validação ponta a ponta dessa etapa no Railway ainda precisa ser registrada. Criação, edição e exclusão são restritas a responsáveis e administradores da clínica. O usuário confirmou os testes manuais de login e dos fluxos de rascunhos durante o desenvolvimento.

**O aplicativo ainda não publica anúncios, não consulta resultados do Meta e não gera conteúdo com IA.** O orçamento exibido é planejamento, não gasto real.

## Comece por aqui

| Documento | Conteúdo |
|---|---|
| [Retomada do projeto](docs/RETOMADA.md) | Onde paramos, decisões já tomadas, próximo incremento recomendado e roteiro para continuar |
| [Release notes](CHANGELOG.md) | Entregas, commits, correções e limites da validação |
| [Arquitetura](docs/ARQUITETURA.md) | Componentes, banco, API, autenticação, autorização e decisões técnicas |
| [Operação e desenvolvimento](docs/OPERACAO.md) | Ambiente local, variáveis, migrations, Railway, testes e diagnóstico |
| [Backlog](docs/BACKLOG.md) | Etapas futuras, dependências e critérios de aceite |

## Objetivo do produto

Dar autonomia para planejar, revisar e futuramente publicar e acompanhar anúncios das clínicas Sorriso de Campinas e Alps Oral Clinic. A estrutura considera múltiplas empresas e usuários com vínculos e permissões próprios. A intenção é suportar outras clínicas/negócios depois.

O fluxo desejado inclui vídeos enviados pelo operador, assistência na criação dos anúncios, revisão humana, publicação controlada e acompanhamento de resultados. Esses passos além dos rascunhos estão no backlog.

## Funcionalidades atuais

- Login por e-mail e senha; logout; sessão armazenada no PostgreSQL.
- Primeiro usuário e duas clínicas criados pelo bootstrap em banco sem usuários.
- Seleção de clínicas vinculadas ao usuário.
- Painel com navegação de visão geral, campanhas e integrações.
- Criar, listar, buscar no navegador, editar e excluir rascunhos.
- Nome, objetivo e orçamento diário planejado por rascunho.
- Briefing opcional com serviço, oferta, público, região, mensagem, destino e observações.
- Consulta do formulário em modo somente leitura para membros.
- Contagem e soma dos orçamentos por clínica.
- Persistência após atualizar a página ou entrar novamente.
- Validação no servidor e controle de acesso por vínculo com a clínica.
- Biblioteca por clínica com links de vídeos/imagens do Drive, contas identificadas por apelido/e-mail e uma mídia opcional por campanha.
- Cadastro, edição e exclusão dos registros da biblioteca; arquivos originais não são alterados.
- Migrations SQL versionadas; endpoints de saúde.

## Stack atual

Node.js / CommonJS, Express 5, PostgreSQL via pg, HTML/CSS/JavaScript sem framework de frontend. express-session + connect-pg-simple para sessões, bcryptjs para senhas, helmet e express-rate-limit. Hospedagem no Railway; código no GitHub.

Não há compilação de frontend, ORM, fila, worker, armazenamento próprio de arquivos ou SDK de IA no código atual. A biblioteca armazena links e metadados no PostgreSQL; não usa Google OAuth nem baixa arquivos. As versões declaradas estão em [package.json](package.json); as resoluções estão no package-lock.json.

## Desenvolvimento rápido

É necessário configurar um PostgreSQL de desenvolvimento e um arquivo .env local conforme [Operação](docs/OPERACAO.md).

```sh
npm ci
npm run db:migrate
npm run dev
```

Abrir http://localhost:3000. O bootstrap exige suas variáveis somente quando a tabela users está vazia. Não usar o banco de produção para testes locais de escrita.

## Situação da documentação

Base de código revisada: commit [8860d6e](https://github.com/matioly/meta_ads_ai/commit/8860d6e4867b565c53d4c2c9c2ece22bb49d7e13), de 24/10/2026. Esta documentação registra o código e o histórico da implementação; não é uma auditoria independente do ambiente Railway.

A versão 1.0.0 do package.json é a versão inicial do pacote, não uma declaração de conclusão de todas as funcionalidades do produto. Não foram criadas tags ou releases formais por esta atualização.

Ao concluir cada incremento, atualizar CHANGELOG, RETOMADA e o status do BACKLOG.


## Incremento de biblioteca do Drive — 24/10/2026

Implementação descrita em [Biblioteca do Drive](docs/BIBLIOTECA_DRIVE.md). Requer migration 006_drive_library.sql. Não exige bucket, chave Google ou nova variável. O deploy e o teste no Railway devem ser confirmados pelo operador após o envio.
