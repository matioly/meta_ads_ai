# Anúncio de vídeo para site — entrega preparatória

## O que mudou
A etapa 5B passa a exigir campanha OUTCOME_TRAFFIC e conjunto PAUSADO com destino WEBSITE e otimização LINK_CLICKS. Um conjunto de engajamento em publicações não é reaproveitado. O criativo de vídeo recebe CTA LEARN_MORE com link HTTPS definido por META_WEBSITE_URL.

## Antes de testar
1. Confirmar qual URL pública do site da Alps deve receber o clique. Não assumir que alpsclinic.com já está funcionando.
2. No Railway do serviço meta_ads_ai, configurar META_WEBSITE_URL=https://<dominio-confirmado> (não alterar assistente_alps).
3. Criar na Meta uma campanha de Tráfego OUTCOME_TRAFFIC e conjunto WEBSITE / LINK_CLICKS, ambos PAUSADOS. O fluxo atual do painel cria somente campanhas de Engajamento e conjuntos POST_ENGAGEMENT / UNDEFINED, portanto NÃO consegue criar esses recursos ainda.
4. Vincular campanha e conjunto compatíveis a um novo rascunho. Se o rascunho atual já tem um criativo Meta, não reutilizá-lo; preservar IDs e conferir antes de tentar novamente.
5. O vídeo enviado na etapa 5A pode ser reutilizado somente quando vinculado ao rascunho correspondente; não reenviar cegamente.
6. Clicar 5B, verificar criativo e anúncio PAUSADOS na Meta. Validar destino e prévia antes de ativar manualmente.

## Limites
- Ainda não há tela para editar o destino por clínica; variável de ambiente é global e deve ser usada apenas no piloto.
- A Meta pode exigir outras propriedades de criativo ou rejeitar o CTA; a implementação não foi homologada na API real.
- Não ativa anúncios, não modifica o bot de WhatsApp e não altera orçamento.
- PR #26 (WhatsApp) é independente e deve continuar sem merge até conclusão daquele fluxo.

## Backlog
- Criar campanha e conjunto OUTCOME_TRAFFIC / WEBSITE / LINK_CLICKS no painel, com validação e confirmação.
- Persistir URL de destino por clínica/rascunho e exibir prévia e validação.
- Testes automatizados do payload e tratamento de erro Meta, com homologação real.
