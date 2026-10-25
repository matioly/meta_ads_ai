# Busca automática sem página Facebook

O actor apify/facebook-ads-scraper aceita URLs de páginas Facebook e URLs de pesquisa da Biblioteca de Anúncios da Meta. **Não aceita perfis Instagram diretamente como startUrls.**

Se o concorrente tem Facebook cadastrado, a busca continua pela página. Sem Facebook, o backend constrói uma pesquisa pública por nome da clínica com país BR e anúncios ativos. O Instagram permanece cadastrado como referência de identidade para conferência manual; ele não é usado como fonte de coleta direta.

A pesquisa por nome pode trazer anunciantes homônimos, ou nenhum resultado apesar de haver anúncios. Conferir o anunciante na Meta antes de registrar. Resultado vazio é informado sem confundir com falha técnica. Não há cobrança adicional automática além da busca acionada pelo usuário.

Após merge, testar Encantta sem Facebook, conferir resultado/erro Apify e verificar custo de execução no console. O formato do actor ainda precisa ser validado com execução real.