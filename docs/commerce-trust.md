# Selos e meios de pagamento

Implementação solicitada pelo proprietário em 26/11/2026. O rodapé global reúne as marcas; as páginas de produto físico, produto digital, ATV+ e o formulário de endereço do checkout recebem um resumo junto à oferta.

O cadastro visual está em `apps/web/src/lib/data/commerce-trust.ts`; as imagens locais e suas fontes estão em `apps/web/static/brand/commerce/`. As marcas não ativam meios de pagamento nem alteram a liberação de ofertas. As opções disponíveis, o total e o parcelamento são confirmados no checkout de cada oferta.

| Serviço | Situação publicada | Próxima condição para ativação |
| --- | --- | --- |
| Shopify | Identifica e aponta para a plataforma do checkout físico existente | Manter os gates, domínios permitidos e validações de cada oferta |
| Cloudflare | Identifica a infraestrutura real do site | Manter HTTPS e os gates de publicação |
| Google | Link para a consulta do domínio no Safe Browsing | Consulta pública; não representa certificação emitida pelo Google |
| HTTPS | Identifica a conexão criptografada e aponta para Privacidade | Manter HTTPS válido |
| Hotmart | Digitais em preparação | Integração e ofertas homologadas, conforme gates comerciais existentes |
| Mercado Pago, Nubank, dois cartões | Imagens com “Em preparação” | Confirmar disponibilidade no provedor e no checkout de cada oferta antes de anunciar aceitação |
| Reclame AQUI | Imagem com “Em preparação” | Perfil aprovado e selo/URL emitidos para a ATVNA |
| Ebit | Imagem com “Em preparação” | Cadastro aprovado, ID da loja e selo/URL emitidos para a ATVNA |
| Site Blindado / Conviso Trust | Imagem com “Em preparação” | Contrato ativo e Trust Center público da ATVNA |

Para concluir uma integração pendente: obter o cadastro e os dados oficiais do serviço, validar o vínculo com o domínio da ATVNA e somente então substituir a imagem provisória pelo selo original e seu link de verificação. Não reutilizar classificação, auditoria ou data de outra loja. Qualquer serviço pago permanece sujeito aos controles de contratação existentes.

Os testes `commerce-trust.e2e.ts` verificam imagens carregadas, marcação das pendências, links, ausência de overflow em três larguras e acessibilidade. `shop-purchase.e2e.ts` verifica a presença do bloco Shopify na compra e no checkout sintéticos, sem chamadas a provedores.
