# Benchmark V3 — busca automática Apify

Requer `APIFY_TOKEN` configurado no Railway (backend apenas). Usa o actor oficial `apify/facebook-ads-scraper` via endpoint síncrono de dataset. Uma execução por concorrente por processo; limite de 20 resultados por busca. Pode gerar cobrança mesmo quando nenhum anúncio é retornado. Não existe agendamento automático.

## Fluxo
1. Cadastrar URL HTTPS da página Facebook do concorrente.
2. Clicar **Buscar anúncios** no Benchmark.
3. A API consulta a Apify e devolve até 20 anúncios públicos normalizados; a interface mostra os resultados temporariamente.
4. Conferir o anunciante na Meta e usar **Registrar na biblioteca** para salvar manualmente a referência no banco (migration 015 existente).

A coleta depende do fornecedor e da disponibilidade dos anúncios na Biblioteca da Meta; os campos variam conforme o retorno. **Não são dados de conversão, investimento ou prova de eficácia.** Nenhum anúncio é criado ou ativado. A integração não persiste resultados automaticamente. Links de mídia são externos e podem expirar.

## Teste
Verificar variável APIFY_TOKEN no Railway, página Facebook da Encantta, botão Buscar anúncios, tempo de execução, retorno vazio/erro e registro de um resultado. Conferir consumo e logs na Apify. O timeout é de ~115 s: se ocorrer, verificar a execução no console antes de repetir para evitar cobrança duplicada.

## Riscos / próximos incrementos
A ferramenta é um serviço de extração terceirizado; confirmar termos da Meta, condições da Apify e conformidade antes do uso em produção. A execução síncrona pode exceder timeouts do proxy; uma futura versão deve usar jobs persistidos e polling, com cotas por clínica e deduplicação. Normalização dos campos deve ser ajustada após inspecionar um retorno real do actor. Nenhum teste real com credenciais foi executado.
