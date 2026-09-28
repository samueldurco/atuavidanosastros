# WU-094 — manifesto independente do Lab

RUN_ID `ATV-20260902-170644Z-01A0630F`. 28/09/2026.

## Resultado

Promoção `atv-promotion/1.3.0` exige referência independente bem formada e quatro hashes correspondentes. Snapshot offline de blobs Git com SHA imutável inclui constituições, limites e dependências explícitas de prompt/schema/rubrica/dataset. Nada é homologado: registro vazio, IA default-off e publicação bloqueada.

## Evidência local

- `pnpm --filter @atv/ai check`: PASS, `test-results/wu094-check.log`.
- `pnpm --filter @atv/ai test:unit`: 39 PASS, zero falhas/skip; `test-results/wu094-unit.log`.
- `node --test scripts/product-lab-corpus.test.mjs`: 6 PASS, `test-results/wu094-corpus.log`.
- `node scripts/lab-artifacts.mjs`: código 0; `test-results/wu094-artifacts.json`, snapshot do commit `8a0e76c9b4f42052708d6d93cf25728a0f812aca`. Esses blobs não mudaram nesta WU.

Casos novos: leitura única por dependência; digest estável; mutações de cada um dos sete blobs atingem somente grupos dependentes; LF/CRLF diferentes nos bytes de origem; igualdade dos digests entre commits com mesmos blobs; blobs ausentes/vazios/grandes; manifesto incompleto/extra/inválido; CLI executada fora da raiz; recusa de referências mutáveis/opções/SHA inexistente/argumentos extras; ausência de autoridade e divergências dos quatro artefatos. Fixtures sintéticas de promoção não comprovam qualidade editorial.

Primeira rodada: testes PASS, check apontou alargamento do tipo literal da versão na fixture. Corrigido com `satisfies ReviewAuthority`; check e testes finais reexecutados. Caminho relativo de import do teste CLI corrigido antes da execução.

## Limites

Não autentica autoria, assinatura, execução real, revisores ou recibos. Referência confiável depende do operador, não pode vir do candidato. Lista de dependências explícita exige manutenção. Nenhuma chamada de modelo/provedor, segredo, migração hospedada, ativação, gasto, UI ou alegação de novo Gate B. Não repetiu suíte web/DB por não alterar runtime do produto ou SQL. Arquivos concorrentes preservados.

WU-093 anterior: commit `8a0e76c9b4f42052708d6d93cf25728a0f812aca`, quality `109000846076`, secrets `109000845593` e Cloudflare Pages `109001533123`: completed/success conferidos pelo conector GitHub.
