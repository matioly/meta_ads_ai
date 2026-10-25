# Cache do Benchmark

Migration 016 adiciona benchmark_ad_cache por company_id e competitor_id, com até 20 resultados normalizados e data da última atualização.

**Ver anúncios salvos** faz GET no PostgreSQL, sem custo Apify. **Atualizar anúncios** faz POST e consulta a Apify explicitamente, podendo gerar cobrança. Após retorno bem-sucedido, o backend salva o conjunto de resultados e substitui o cache anterior, inclusive se estiver vazio. Falhas preservam o cache antigo. Cada clínica possui seu próprio cache.

O primeiro acesso após deploy não mostrará os 20 anúncios da execução anterior, pois a versão anterior não os persistia. É necessária uma atualização manual inicial.

A análise com IA será um incremento separado. Dados e links externos podem expirar. Não há execução automática periódica. Conferir migration e testar leitura sem cobrança, atualização, recarga e isolamento por clínica.