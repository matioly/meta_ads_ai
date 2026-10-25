## Prioridades revisadas — 25/10/2026 após PR #62

1. **P0 — Corrigir papel viewer:** `src/workspace-admin.js` aceita `viewer`, mas `001_initial.sql` limita a `owner/admin/member`. Criar migration e testes, ou harmonizar o contrato. Não homologado.
2. **P0 — Validar navegação após PR #62:** flash de Visão geral ao abrir Campanhas relatado repetidamente; testar em browser após deploy, revisar inicialização sem multiplicar hacks CSS.
3. **P1 — Homologar cadastro de clínicas e usuários:** owner, admin, viewer, isolamento entre clínicas, e-mail duplicado, login de novo usuário.
4. **P1 — Conferir dashboard Meta 30 dias:** moeda, período, dados ausentes, valores vs Gerenciador Meta.
5. **P1 — Revisar fluxo de ativação:** confirmação explícita, permissões, idempotência e logs; nunca ativar automaticamente.
6. **P2 — Gestão de contas:** convites, vínculo de usuário já existente, troca de papéis, desativação, recuperação de senha, auditoria.
7. **P2 — UX e recursos avançados:** interesses, destinos site/WhatsApp, Drive OAuth/streaming, IA assistida e relatórios.

Detalhes e evidências: [Guia de retomada](GUIA_DE_RETOMADA_2026-10-25.md), [Telas](TELAS_E_NAVEGACAO.md), [Cadastro](CADASTRO_CLINICAS_USUARIOS.md). Os status antigos abaixo são históricos e não substituem esta lista.

# STATUS PRIORITÁRIO — 25/10/2026

- META01 inventário Alps: validado em produção; permissão da Página Facebook a reconfirmar.
- META02 conexão Marketing API: validada.
- META03 leitura de campanhas/conjuntos/anúncios e indicadores: implementada; reconciliação das métricas pendente.
- META04.1 campanha PAUSADA: validada em produção.
- META04.2 conjunto PAUSADO: validado pelo operador, ID 120249780122340576.
- META04.3 rascunhos de criativo: salvar e recuperar todos os campos validado pelo operador.
- META05A envio Drive→Meta: código PR #20, **não homologado**; exige download público direto, limite 75 MB, migration 013.
- META05B criativo/anúncio PAUSADO: código PR #20, **não homologado**; exige Página Facebook aprovada, compatibilidade de destino e token com permissões.

**Prioridade imediata:** conferir deploy e migration 013; testar 5A, verificar vídeo na Meta; testar 5B, verificar anúncio PAUSADO; revisar permissão de escrita por papel, segurança de upload e idempotência remota. Nunca ativar anúncios sem autorização explícita. Próximos: OAuth Drive multi-conta, upload em streaming, CTA/destino/thumbnail, auditoria, prévia fiel, aprovação humana, geração IA e métricas.

---

## Atualização vigente — 25/10/2026

- **META04.1 CONCLUÍDA e validada em produção:** campanha real `Teste Integracao API`, ID `120249780034580576`, objetivo Engajamento, status PAUSED, criada e consultada no painel da Alps. Sem conjuntos ou anúncios. Parâmetro exigido pela Meta: `is_adset_budget_sharing_enabled=false` (erro 100/subcódigo 4834011).
- **META04.2A em PR:** prévia de conjunto sem qualquer chamada de escrita à Meta; campanha pausada, nome, Brasil, idades e orçamento diário; validação de campos e escopo da clínica.
- **META04.2B a fazer:** definir optimization_goal/billing_event/destination_type e promoted_object conforme objetivo e conta; confirmar disponibilidade de página e destino WhatsApp; seleção de regiões (Campinas/raio) e posicionamentos; orçamento e datas; criação PAUSED somente após aprovação, proteção durável contra duplicações e testes.
- **META04.3:** criativos/anúncios a partir de mídia autorizada (links Drive por si só não dão acesso binário à Meta).
- **Pendência paralela:** consultas `meta-connection` e `meta-insights` exibiram HTTP 400 em uma sessão; diagnosticar separadamente, sem comprometer a criação validada.
- **Segurança:** não habilitar veiculação automática; nenhuma automação de gastos autorizada. As seções históricas abaixo preservam o planejamento anterior.

# Backlog e evolução

Data-base: 24/10/2026. Este é um plano proposto, não uma lista de funcionalidades prontas. Prioridades podem mudar; os IDs permanecem estáveis.

## Estado atualizado — 24/10/2026

- **META01: implementada e validada manualmente em produção** (PR #1, migration 007, formulário `/meta-assets.html`, persistência em `meta_assets`). Não confundir com verificação automática dos IDs na Meta. Página Facebook da Alps ainda com acesso pendente.
- **L01: cadastro e vínculo de mídia confirmados manualmente em produção** para vídeo Pamela ADS2; testes de autorização por papéis e múltiplas clínicas em produção não foram confirmados.
- **META02: próximo incremento prioritário** — autenticação segura no servidor, checagem de permissões e conexão de leitura com conta de anúncios da Alps. Nenhum token deve ser salvo no PostgreSQL em texto aberto ou no repositório; avaliar gestão de credenciais por clínica e revogação.
- META03 e posteriores continuam pendentes. Nenhuma publicação nem gasto real autorizado.

A tabela histórica abaixo foi escrita antes dessas validações; para o status vigente prevalece esta seção.

## Entregue

- [x] Repositório separado, servidor Node/Express e deploy Railway.
- [x] PostgreSQL, pool e diagnóstico de conexão.
- [x] Migrations de usuários, empresas, vínculos, sessões e campanhas.
- [x] Bootstrap do primeiro usuário e das duas clínicas.
- [x] Login/logout com sessão persistida.
- [x] Layout inicial aprovado e seletor de clínica.
- [x] Listagem, criação, edição e exclusão de rascunhos.
- [x] Busca local e indicadores de planejamento por clínica.
- [x] Validação de campos e autorização no servidor.
- [x] Documentação de arquitetura, operação, histórico e retomada.

Os testes funcionais anteriores ao briefing foram confirmados manualmente pelo operador. B01 tem implementação versionada; seu aceite operacional específico ainda está pendente. Isso não marca testes automatizados, auditoria de segurança ou integração externa como concluídos.

## Decisão de armazenamento — 24/10/2026

A equipe já distribui arquivos em várias contas Google. Foi escolhida biblioteca de links, com apelido/e-mail da conta e vínculo ao rascunho, sem bucket neste momento. L01 está implementado; aceite no Railway pendente. M01/M02 originais (upload próprio e pré-visualização hospedada) ficam adiados, não concluídos.

| ID | Estado | Escopo | Aceite |
|---|---|---|---|
| L01 | Implementado; aceite operacional pendente | CRUD de contas e links por clínica; vídeo/imagem; uma mídia por rascunho | Cadastrar, editar, vincular, recarregar, verificar member e clínica diferente |
| L02 | Próxima proposta | Acesso autorizado ao Drive para uso automatizado | Definir consentimento/contas; validar download privado e tratar revogação sem tornar pastas públicas |

## Ordem de produto recomendada

Briefing completo → biblioteca de links → acesso autorizado à mídia → assistência de conteúdo → revisão → conexão Meta inicialmente de leitura → publicação controlada → resultados → automações graduais.

A preparação da conexão Meta pode avançar antes da IA, conforme disponibilidade dos ativos. Publicação depende de credenciais, permissões e revisão; nenhuma atividade deste backlog autoriza por si só gastos reais.

## Próxima entrega e base técnica

| ID | Prioridade | Trabalho | Dependências | Critério de aceite |
|---|---|---|---|---|
| B01 | Implementado; aceite operacional pendente | Briefing opcional com sete campos, JSONB, validação e consulta por member (8860d6e) | Migration 005 no ambiente | Confirmar persistência, limpeza, compatibilidade e isolamento no Railway; roteiro em OPERACAO.md |
| T01 | Alta | Testes de API e PostgreSQL de teste | Ambiente isolado | Cobrir login, papéis, acesso entre clínicas, CRUD, limites e migrations em banco novo |
| T02 | Alta | Validar migrations novas não vazias | Preservar exceção histórica 002 | Falhar com nome claro em SQL novo vazio; instalação do zero funciona |
| T03 | Alta | Fixar versões suportadas de Node/npm e configurar CI | Escolha de versões | Instalação reproduzível, sintaxe e testes executados em PR |
| T04 | Alta | Verificar backup e testar restauração | Acesso operacional ao provedor | Restauração validada em ambiente separado, com procedimento e retenção documentados |
| T05 | Média | Logs com identificador de requisição e erros HTTP corretos | Definir formato | Diagnóstico sem senhas/tokens; JSON inválido e payload grande classificados adequadamente |
| T06 | Média | Auditoria e concorrência de alterações | Migration e modelo de eventos | Registrar autor/data; detectar edição desatualizada em vez de sobrescrever silenciosamente |
| T07 | Média | Paginação e busca no servidor | Volume e contrato de API | Navegar grandes listas preservando isolamento e ordenação |
| T08 | Média | Melhorias de UX e acessibilidade | Revisão do painel atual | Teclado/foco, estados de erro e telas menores verificados; evitar perda acidental de edição |

## Mídia e produção de anúncios

| ID | Prioridade | Trabalho | Dependências | Critério de aceite |
|---|---|---|---|---|
| M01 | Adiado; biblioteca por links escolhida | Upload de vídeos/imagens e biblioteca por clínica | Escolher armazenamento de objetos | Validar tipo/tamanho, separar acesso por clínica, mostrar progresso/erro e recuperar arquivo após novo login |
| M02 | Adiado no formato de upload próprio | Vincular mídias ao rascunho e pré-visualizar | M01 | Escolher/substituir mídia sem expor arquivos de outras clínicas |
| M03 | Média | Processamento assíncrono, miniaturas e metadados | M01 e avaliação de volume | Estado pendente/pronto/erro; reprocessamento controlado sem bloquear API |
| A01 | Alta após B01 | Geração assistida de texto/títulos/variações | Escolher provedor/modelo, credenciais e orçamento | Gerar a partir do briefing; resultado editável e salvo; limites de custo; erros claros; sem publicação automática |
| A02 | Média | Histórico de geração e versionamento de textos | A01 | Rastrear parâmetros e versão; recuperar variações e registrar revisão humana |
| A03 | Média | Revisão de conteúdo odontológico | Definir critérios com responsável da clínica | Checklist editorial e aprovação registrados; revisar políticas vigentes antes de publicar, sem prometer conformidade automática |

Provedor, modelo e armazenamento ainda precisam ser escolhidos. O briefing inicial já tem sete campos opcionais; regras de obrigatoriedade para publicação serão definidas antes da integração. Não há segredo de IA exigido pelo código atual.

## Integração Meta

| ID | Prioridade | Trabalho | Dependências | Critério de aceite |
|---|---|---|---|---|
| META01 | Alta antes de integração | Inventário dos ativos por clínica | Operador com acesso ao portfólio | Mapear conta de anúncios, página, Instagram e destino/WhatsApp corretos; registrar IDs no local apropriado |
| META02 | Validado: consulta inicial de conta; revogação/reconexão pendentes | Conexão/autorização Meta | META01; verificar documentação vigente e permissões do caso | Credenciais somente no servidor, protegidas; vinculação explícita por clínica; reconexão/revogação e erro de expiração tratados |
| META03 | Implementado no PR; validação em produção pendente | Consulta inicial de contas e campanhas | META02 | Listar ativos corretos sem criar anúncios ou alterar orçamento |
| META04 | Alta | Mapear modelo interno para campanha/conjunto/anúncio | B01, M02 e META03 | Objetivo, público, orçamento, posicionamentos, destino e mídia validados; IDs externos separados dos IDs internos |
| META05 | Alta | Revisão e publicação controlada | META04 e estados de aprovação | Resumo final de clínica/conta/mídia/orçamento; aprovação explícita; evitar duplicação; registrar resultado por etapa e falhas parciais |
| META06 | Média | Pausar/retomar e consultar status externo | META05 | Estado reconciliado com Meta; autorização e confirmação das alterações sensíveis |
| META07 | Média | Métricas reais e sincronização | META03; definições de indicadores | Exibir fonte, período, fuso e última atualização; separar orçamento planejado de gasto real |
| META08 | Posterior | Recomendações e automações com limites | Histórico confiável e auditoria | Simulação, tetos, aprovação conforme regra e botão de parada; nunca otimização irrestrita por padrão |

Permissões, revisão do aplicativo, tipos de token e versão da API devem ser verificados na documentação oficial no momento da implementação. A aprovação do bot de WhatsApp de outro projeto não comprova autorização deste aplicativo para Marketing API.

## Usuários e múltiplas empresas

| ID | Prioridade | Trabalho | Critério de aceite |
|---|---|---|---|
| U01 | Média antes de ampliar equipe | Convites, usuários e vínculos por clínica | Responsável administra apenas escopo autorizado; nenhum usuário escolhe livremente seu próprio privilégio |
| U02 | Alta antes de ampliar equipe | Troca/recuperação de senha e revogação de sessões | Fluxo seguro, expiração e uso único de recuperação; sessões revogáveis |
| U03 | Média | Cadastro/configuração de clínicas | Dados próprios por clínica; sem depender de novos valores fixos no bootstrap |
| U04 | Posterior | MFA e permissões mais detalhadas | Política definida e testada; owner/admin deixam de ser equivalentes quando necessário |
| U05 | Posterior | Retenção, exportação e exclusão de dados | Regras documentadas e autorização verificada |

## Decisões abertas

- Quais campos do briefing deverão ser obrigatórios na futura revisão/publicação? No rascunho atual todos são opcionais.
- Qual clínica e conta de anúncios serão piloto?
- Qual armazenamento de mídia e seus limites?
- Qual provedor/modelo de IA e teto de custo?
- Qual fluxo de aprovação antes de publicar e de alterar orçamento?
- Quais métricas realmente orientam a operação e qual janela de atribuição?
- Quando haverá novos usuários e quais funções terão?
- Qual política de backup, retenção e auditoria?

## Definição de pronto

Uma entrega deve ter código e migrations versionados quando necessários; validação no servidor; isolamento por clínica; estados de erro na interface; verificações adequadas ao risco; deploy e teste funcional registrados. Atualizar CHANGELOG, RETOMADA e este backlog com evidências e limitações. Dependências externas só ficam concluídas depois de testadas com o serviço correspondente.

