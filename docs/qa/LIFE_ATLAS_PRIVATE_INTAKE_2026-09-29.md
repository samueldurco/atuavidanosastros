# Atlas da Vida 360 — intake privado de prioridades (WU211)

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo: E1 local e parcial de `life-atlas` em `/atlas-da-vida-360`.

O formulário autenticado solicita quatro prioridades em ordem escolhida pela pessoa, contexto opcional e consentimento próprio para salvar. A requisição `atv-natal-request/4` aceita somente `life-atlas` e usa a revisão do perfil natal exato já salvo. Cliente, domínio e RPC validam as prioridades; a migração copia as prioridades, o contexto consentido e o snapshot natal para um run privado imutável. As travas de release, acesso, quota, idempotência e revisão do perfil continuam aplicáveis. O rascunho é limpo após o envio; a sessão guarda apenas o UUID de correlação.

Validação local com dados sintéticos:

- Quatro arquivos da vertical natal: 217 testes passaram (`test-results/wu211-final-tests.txt`); casos adicionais de formas inválidas do objeto Atlas: 72 testes do arquivo de integração passaram (`test-results/wu211-invalid-shapes.txt`).
- Domínio: 34 testes passaram (`test-results/wu211-domain.txt`); checagens de tipo do domínio e web passaram, esta última com zero erros/avisos (`test-results/wu211-domain-check.txt`, `test-results/wu211-final-check.txt`).
- A integração local exercitou rejeições de versões/produtos incompatíveis, prioridades ausentes, duplicadas, malformadas e campos forjados, gate fechado, snapshot exato, contexto opcional, idempotência e reversão. `supabase/forward-fixes/disable_life_atlas_priorities.sql` fecha novas escritas v4 e preserva runs, recibos e recuperação anteriores; reaplicar a migração restaura a idempotência.

E1 segue parcial: faltam facts natais e método editorial versionado para cruzar as quatro áreas com capítulos do mapa. E2–E5, PDF/SVG, aprovação editorial, engine/licença, migração e sessão hospedadas e liberação permanecem pendentes. Gate B/Lab acompanham o produto; nenhum gate/default13 foi aberto e gasto automático segue R$ 0.
