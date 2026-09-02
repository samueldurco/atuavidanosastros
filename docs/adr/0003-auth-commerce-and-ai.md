# ADR 0003 — Auth, comércio e IA

- Estado: aceito
- Data: 2026-09-02

## Autenticação

Supabase Auth é a autoridade. Google OAuth (`openid`, `email`, `profile`) é o método inicial principal. Magic link/OTP fica atrás de flag até SMTP Resend rotacionado e validado.

## Comércio

Hotmart é a autoridade de checkout, cobrança, recorrência e evento financeiro. Eventos entram em inbox idempotente, são reconciliados e só então produzem entitlement. Credenciais expostas no handoff não podem ser usadas; integração live permanece desativada até rotação e Hottok válido.

## IA

Gemini pode sintetizar somente dados calculados e conteúdo aprovado, através de gateway versionado, com Free Tier e degradação ao atingir limites. IA nunca calcula mapa, sorteia Tarot, define preço, concede acesso ou decide estado comercial.

