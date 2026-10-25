# Fase 5A + 5B — vídeo e anúncio pausado

## Objetivo
Converter um rascunho já salvo em vídeo na Meta e anúncio PAUSADO, mantendo autorização manual em cada etapa. Nenhuma rota ativa anúncios.

## Rotas
- POST /api/companies/:companyId/creative-drafts/:draftId/meta-video com JSON {"confirm":true}
- POST /api/companies/:companyId/creative-drafts/:draftId/meta-paused-ad com JSON {"confirm":true}

Ambas exigem sessão, acesso à clínica e variável de ativação específica.

## Railway
- META_VIDEO_UPLOAD_ENABLED=true
- META_PAUSED_AD_CREATION_ENABLED=true
- META_ACCESS_TOKEN (já existente, não compartilhar)
- npm run db:migrate no pre-deploy (migration 013)

Habilitar as flags apenas depois de revisar o código e validar o fluxo. Nenhuma configuração afeta o serviço assistente_alps.

## Dependências e limites
- Google Drive: arquivo compartilhado para qualquer pessoa com o link, sem login e com resposta direta de vídeo. Downloads com tela de confirmação, vírus, limite de cota ou cookies podem falhar. Limite provisório 75 MB; arquivo é carregado em memória. Futuro: OAuth Google e upload em streaming.
- Meta: conta de anúncios configurada, token com ads_management, campanha e conjunto PAUSADOS, página do Facebook com acesso aprovado e ID correto. O objetivo e o destino devem ser compatíveis. Meta pode exigir thumbnail, CTA e outras configurações no criativo; erros são retornados para diagnóstico.
- O upload do vídeo e a criação de anúncio são operações separadas e explícitas.
- IDs Meta persistidos em creative_drafts. A edição do rascunho é bloqueada após o upload para evitar divergências.
- Em caso de timeout após uma operação Meta, pode haver criação remota antes da persistência local: conferir o Gerenciador de Anúncios antes de tentar novamente. A trava de concorrência evita cliques simultâneos, mas não substitui idempotência remota.
- Nenhuma ativação automática nem alteração de orçamento.

## Teste manual
1. Fazer merge, deploy e conferir Aplicada: 013_meta_video_ads.sql.
2. Na etapa 3 selecionar o rascunho salvo e conferir campanha/público.
3. Clicar 5A e confirmar. Validar ID e vídeo na biblioteca Meta.
4. Clicar 5B e confirmar. Validar ID e status PAUSADO no Gerenciador de Anúncios.
5. Recarregar, selecionar o mesmo rascunho, confirmar que os IDs persistiram; repetir ação não deve criar duplicata quando ID local está presente.

## Próximas etapas
- OAuth Drive para várias contas e vídeos privados.
- Upload de vídeos maiores por streaming/resumable.
- Thumbnail, CTA, destination e validação de criativos específicos por objetivo.
- Preview fiel Instagram/Facebook.
- Tela de revisão final e ativação manual separada.
- Histórico de operações e idempotência durável.
