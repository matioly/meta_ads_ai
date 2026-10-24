# Backlog e evolução

Data-base: 24/10/2026. Este é um plano proposto, não uma lista de funcionalidades prontas. Prioridades podem mudar; os IDs permanecem estáveis.

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

Os testes funcionais foram confirmados manualmente pelo operador. Isso não marca testes automatizados, auditoria de segurança ou integração externa como concluídos.

## Ordem de produto recomendada

Briefing completo → mídia → assistência de conteúdo → revisão → conexão Meta inicialmente de leitura → publicação controlada → resultados → automações graduais.

A preparação da conexão Meta pode avançar antes da IA, conforme disponibilidade dos ativos. Publicação depende de credenciais, permissões e revisão; nenhuma atividade deste backlog autoriza por si só gastos reais.

## Próxima entrega e base técnica

| ID | Prioridade | Trabalho | Dependências | Critério de aceite |
|---|---|---|---|---|
| B01 | Alta / próxima proposta | Briefing: serviço, oferta, público, região, mensagem, destino e observações | Definir campos com operador | Criar/editar/persistir briefing por clínica; rascunhos antigos continuam válidos; validação e limites no servidor |
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
| M01 | Alta após B01 | Upload de vídeos/imagens e biblioteca por clínica | Escolher armazenamento de objetos | Validar tipo/tamanho, separar acesso por clínica, mostrar progresso/erro e recuperar arquivo após novo login |
| M02 | Média | Vincular mídias ao rascunho e pré-visualizar | M01 | Escolher/substituir mídia sem expor arquivos de outras clínicas |
| M03 | Média | Processamento assíncrono, miniaturas e metadados | M01 e avaliação de volume | Estado pendente/pronto/erro; reprocessamento controlado sem bloquear API |
| A01 | Alta após B01 | Geração assistida de texto/títulos/variações | Escolher provedor/modelo, credenciais e orçamento | Gerar a partir do briefing; resultado editável e salvo; limites de custo; erros claros; sem publicação automática |
| A02 | Média | Histórico de geração e versionamento de textos | A01 | Rastrear parâmetros e versão; recuperar variações e registrar revisão humana |
| A03 | Média | Revisão de conteúdo odontológico | Definir critérios com responsável da clínica | Checklist editorial e aprovação registrados; revisar políticas vigentes antes de publicar, sem prometer conformidade automática |

Provedor, modelo, armazenamento e formato final do briefing ainda precisam ser escolhidos. Não há segredo de IA exigido pelo código atual.

## Integração Meta

| ID | Prioridade | Trabalho | Dependências | Critério de aceite |
|---|---|---|---|---|
| META01 | Alta antes de integração | Inventário dos ativos por clínica | Operador com acesso ao portfólio | Mapear conta de anúncios, página, Instagram e destino/WhatsApp corretos; registrar IDs no local apropriado |
| META02 | Alta | Conexão/autorização Meta | META01; verificar documentação vigente e permissões do caso | Credenciais somente no servidor, protegidas; vinculação explícita por clínica; reconexão/revogação e erro de expiração tratados |
| META03 | Alta | Consulta inicial de contas e campanhas | META02 | Listar ativos corretos sem criar anúncios ou alterar orçamento |
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

- Quais campos do briefing serão obrigatórios?
- Qual clínica e conta de anúncios serão piloto?
- Qual armazenamento de mídia e seus limites?
- Qual provedor/modelo de IA e teto de custo?
- Qual fluxo de aprovação antes de publicar e de alterar orçamento?
- Quais métricas realmente orientam a operação e qual janela de atribuição?
- Quando haverá novos usuários e quais funções terão?
- Qual política de backup, retenção e auditoria?

## Definição de pronto

Uma entrega deve ter código e migrations versionados quando necessários; validação no servidor; isolamento por clínica; estados de erro na interface; verificações adequadas ao risco; deploy e teste funcional registrados. Atualizar CHANGELOG, RETOMADA e este backlog com evidências e limitações. Dependências externas só ficam concluídas depois de testadas com o serviço correspondente.
