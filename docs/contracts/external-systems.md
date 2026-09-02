# Contrato de sistemas externos

| Sistema | Autoridade | Escrita permitida nesta fase | Falha segura |
|---|---|---|---|
| Supabase Auth | identidade e sessão | produção somente após OAuth/SMTP validados | Google indisponível → login temporariamente indisponível |
| Supabase PostgreSQL | dados canônicos ATV | migrations expand/contract | bloquear mutação, preservar leitura |
| Hotmart | checkout e estado financeiro | live desativado até rotação | manter compra pendente, reconciliar depois |
| Resend | e-mail transacional | desativado até chave rotacionada | entrega permanece recuperável na Biblioteca |
| Cloudflare Pages/DNS | hosting e borda | após build e preview verdes | reativar deploy/DNS anterior |
| GTM/GA4 | analytics consentido | somente após consentimento | nenhuma coleta não essencial |
| Gemini | síntese elegível | Free Tier e flag explícita | conteúdo editorial determinístico |
| Geocodificação | cidade → coordenadas/timezone | cache persistente | solicitar confirmação manual de local |

