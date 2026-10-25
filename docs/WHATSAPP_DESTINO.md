# WhatsApp: validação segura antes de criar anúncios

## Incidente observado (25/10/2026)
- O upload do vídeo da etapa 5A concluiu.
- A etapa 5B recebeu da Meta a mensagem de URL de website obrigatória.
- O conjunto existente é criado com `optimization_goal=POST_ENGAGEMENT` e `destination_type=UNDEFINED` em `src/meta-create-adset.js`.
- O criativo de vídeo atual não configura destino WhatsApp nem CTA de mensagem.
- Não adicionar uma URL fictícia para contornar a validação.

## Entrega deste PR: proteção, NÃO publicação WhatsApp
A etapa 5B consulta `destination_type` e `optimization_goal` do conjunto antes de criar o criativo. Se não forem `WHATSAPP` e `CONVERSATIONS`, retorna erro 422 com diagnóstico seguro. Mesmo quando são compatíveis, a criação de um novo criativo é bloqueada até existir implementação e homologação de CTA para mensagens. Isso impede tentativas de criação parcialmente configuradas e evita gastos: nenhum anúncio é ativado automaticamente.

**Limitação importante:** esta entrega é uma proteção preventiva, não conclui a publicação de anúncios de WhatsApp. O fluxo de criação de anúncios novos permanece bloqueado deliberadamente. Criativos já criados podem seguir para criação pausada quando o conjunto é compatível; revisar esse caminho antes de uso real.

## Próximos incrementos
1. Criar formulário e endpoint separado para conjuntos WhatsApp, validando na API da Meta o objetivo, a página, o número de WhatsApp vinculado e o destino, sem reutilizar conjuntos `POST_ENGAGEMENT`.
2. Definir o payload de criativo de vídeo com CTA de mensagem aceito para a conta, objetivo e versão da Marketing API, com testes automatizados e validação real em ambiente de teste.
3. Conferir IDs persistidos e status PAUSADO na Meta antes de permitir novas tentativas, evitando duplicatas.
4. Habilitar a etapa 5B somente após homologação ponta a ponta; nunca ativar anúncio automaticamente.

## Teste de regressão manual
- Selecionar o conjunto antigo de engajamento e clicar 5B: deve retornar erro explicativo sem criar criativo ou anúncio.
- Verificar que o ID de vídeo da etapa 5A continua salvo; não reenviar o vídeo.
- Confirmar que nenhuma configuração do projeto separado de WhatsApp foi alterada.
