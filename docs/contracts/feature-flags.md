# Feature flags

| Flag | Padrão | Condição para ativar |
|---|---:|---|
| `FEATURE_AI` | false | avaliação, privacidade e limite de cota aprovados |
| `FEATURE_HOTMART_LIVE` | false | credenciais rotacionadas, Hottok e reconciliação verdes |
| `FEATURE_MAGIC_LINK` | false | Resend rotacionado, SPF/DKIM/DMARC e entrega validados |
| `FEATURE_PHYSICAL_CHECKOUT` | false | fora do escopo; exige catálogo real e nova decisão |

Flags desligam comportamento sem apagar dados ou contratos.

