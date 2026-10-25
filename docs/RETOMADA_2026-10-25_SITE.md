> Atualização de diagnóstico — 25/10/2026: adicionado botão “Conferir campos do 5B (sem criar)”. Após merge e deploy, selecionar o rascunho salvo na etapa 3 e usar esse botão. A consulta GET mostra IDs, contas, vínculo, status, objetivo, destino e otimização com valores recebidos/esperados. Corrigir somente os campos AJUSTAR. A causa em produção continua não confirmada. Não reenviar o vídeo para diagnosticar. A resposta 422 do 5B também inclui o mesmo diagnóstico. Nenhuma migration ou variável nova. Testes locais com respostas Meta simuladas; homologação no Railway pendente.

# Retomada — 25/10/2026, fim da sessão (prioridade máxima)

## Objetivo imediato
**Criar o primeiro anúncio de vídeo Pamela ADS2 para o site https://alpsclinic.com, com CTA “Saiba mais”, SEM ativar veiculação.** Prioridade do operador: caminho mais fácil/rápido; melhorias depois. O bot WhatsApp `matioly/assistente_alps` não deve ser alterado.

## Código e GitHub — confirmado
- PR #27 `feat/site-video-ad-cta` **MERGED na main** (squash SHA `e8ea456e085ea84c1512d7e28715c0a2f9a8ac2b`). Adicionou CTA `LEARN_MORE` com link HTTPS, padrão `https://alpsclinic.com` (sobrescrevível por `META_WEBSITE_URL`); exige campanha `OUTCOME_TRAFFIC`, conjunto `destination_type=WEBSITE` e `optimization_goal=LINK_CLICKS`, todos PAUSED; bloqueia reutilização de criativo existente de destino incerto. Adicionou `docs/FASE_5_SITE.md`.
- No mesmo PR #27, `src/creative-drafts.js` passou a permitir **editar vínculos de campanha/conjunto após o upload do vídeo**, desde que a mídia seja a mesma e ainda não exista criativo Meta. Isso evita reupload do vídeo ao mudar a campanha.
- PR #26 `feat/whatsapp-destination-preflight` continua **DRAFT e não merged**. WhatsApp ad CTA ainda não implementado; não misturar os fluxos.
- O painel continua criando campanhas/conjuntos de Engajamento na sua etapa de criação; campanha de Tráfego foi criada **manualmente no Gerenciador de Anúncios** para o piloto.
- Não foi executada suíte automatizada nesta sessão. O operador usou o painel em produção, indicando que o endpoint atualizado de 5B está acessível; não há confirmação independente de deploy ou sucesso do anúncio.

## Ações feitas pelo operador — prints do navegador
1. Criou a campanha Meta **`Teste Meta ADS AI`** com objetivo **Tráfego** na conta de anúncios Alps, e um conjunto **`Novo conjunto de anúncios de Tráfego`**. O painel Meta Ads AI lista a campanha como **Pausada**. Campanha e conjunto foram desativados; o conjunto estava azul/ativo inicialmente, depois operador o pausou.
2. Configurou destino **Site** e endereço para Alps; foi orientado a usar `https://alpsclinic.com`. Formato imagem/vídeo único e complemento de navegador “Nenhum”. Na tela de conjunto, a Meta mostrava inicialmente a meta de desempenho **“Maximizar o número de visualizações da página de destino”**; foi orientado a alterar para **“Maximizar o número de cliques no link”**. **Não há comprovação definitiva de que o ajuste tenha persistido**.
3. A Meta mostrava “Conferir e publicar (2)”, mas o operador explicou que essas duas alterações pendentes eram antigas e não nossas; não assumir que pertençam à campanha piloto.
4. Na etapa 3 do painel, rascunho **`Anuncio teste video pamela`**, mídia **`Pamela ADS2`**, conta de Drive **`Matioly`**, texto principal de teste `fdsffd`, descrição `Informação complementar`. Salvou o rascunho; campos de campanha/conjunto não aparecem integralmente nas capturas.
5. Tentativas de clicar **5B — Criar anúncio pausado**:
   - Primeiro erro: **“Envie o vídeo e vincule campanha e público antes de criar o anúncio.”** Indica pelo menos um dos IDs necessários ausente na tentativa.
   - Depois: **“Campanha e público precisam pertencer à mesma conta e estar pausados.”** O operador descobriu que o conjunto estava ativo (azul) e o pausou.
   - **ÚLTIMO ERRO, AINDA NÃO RESOLVIDO:** **“Para enviar ao site, selecione uma campanha de Tráfego (OUTCOME_TRAFFIC) e um conjunto com destino WEBSITE e otimização LINK_CLICKS, ambos PAUSADOS. O conjunto antigo de engajamento não é compatível.”** Este erro ocorre no `src/meta-video-ads.js` na comparação exata de `campaign.objective`, `adset.destination_type`, `adset.optimization_goal`. **Não há confirmação de qual dos três campos diverge.** A mensagem genérica NÃO prova que o conjunto é de Engajamento; pode ser destino ou otimização diferente.
6. **Não há anúncio novo confirmado como criado**, nem criativo confirmado para esse rascunho; manter PAUSED. O vídeo Pamela ADS2 foi anteriormente enviado à Meta segundo o operador e não deve ser reenviado cegamente.

## PRÓXIMA AÇÃO RECOMENDADA (primeiro passo ao retomar)
**Diagnosticar os valores reais da API da Meta antes de alterar qualquer configuração ou insistir em 5B.** Fazer pequeno PR com diagnóstico seguro de leitura, preferencialmente expandindo a resposta 422 com campos normalizados e sem tokens: `campaignObjective`, `adsetDestinationType`, `adsetOptimizationGoal`, além de `campaignId` e `adsetId` e um indicador de qual requisito falhou. Alternativa: endpoint read-only por rascunho com autenticação/escopo da clínica e resposta sanitizada. Não revelar tokens. A UI `public/meta-video-ads.js` hoje exibe somente `data.error` e `data.metaErrorDetail`; adaptar para mostrar diagnóstico, se necessário.
Depois do deploy, solicitar ao operador nova tentativa 5B **apenas se a validação continuar bloqueando antes de criar** ou usar endpoint somente leitura, capturar os valores e corrigir **a causa**, não afrouxar validações sem evidência. Possibilidades: meta de desempenho permanece `LANDING_PAGE_VIEWS`; `destination_type` pode ser outro valor para esse conjunto; vínculo do rascunho pode apontar para conjunto antigo. Se necessário, reabrir rascunho e confirmar campanha e conjunto corretos. Não ativar campanha, conjunto ou anúncio.

## Segurança / cautelas
- Status de campanha, conjunto e anúncio devem ser `PAUSED`; nunca publicar `ACTIVE` para testar.
- Antes de repetir 5B após erro de criação Meta ou timeout, consultar anúncios/criativos para evitar duplicatas. O erro 422 de pré-validação não criou anúncio nessa tentativa.
- Token em `META_ACCESS_TOKEN` no Railway do serviço `meta_ads_ai`, jamais em GitHub, logs ou chat.
- Site confirmado pelo operador: `https://alpsclinic.com`.
- Próximo desenvolvimento: diagnóstico de incompatibilidade, criação real do anúncio 5B, confirmação do ID e prévia no Gerenciador. Depois automatizar criação de campanhas Tráfego e, futuramente, destino WhatsApp.

## Arquivos
`src/meta-video-ads.js`, `src/creative-drafts.js`, `public/meta-video-ads.js`, `public/meta-creative-plan.js`, `docs/FASE_5_SITE.md`, `docs/RETOMADA.md`, `CHANGELOG.md`.
