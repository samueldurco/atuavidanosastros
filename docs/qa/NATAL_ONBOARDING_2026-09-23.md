# WU-050 — Onboarding natal: contrato e persistência

RUN_ID: ATV-20260902-170644Z-01A0630F. Somente fixtures sintéticas e banco PGlite local com migrações SQL reais. Não há coleta de dados reais nem ativação hospedada.

## Evidência

- Dez testes integrados: início progressivo, recuperação pela API, precisão preservada, versionamento, conflito de revisão sem duplicação, consentimento estrito, isolamento de usuários, proibição de escrita direta, negação anon/service, datas/horas inválidas, DST gap/fold, exclusão de todas as versões próprias, soft-delete, CSRF/auth/body limit e contenção forward-fix mantendo recuperação.
- Suite web: 100 testes / 18 arquivos PASS. Typecheck: zero erros/warnings. ESLint/Prettier focais e diff-check verificados separadamente. Logs locais em `test-results/wu050-{onboarding,web-full,check,lint,format}.log`.
- Primeiras execuções detectaram fechamento faltante em fixture TS, CASE SQL sem parênteses, tipos unknown de JSON e expressão de controles incompatível com lint; corrigidos antes do fechamento. Nenhuma falha mascarada.
- CI da WU-049 (4aff428): quality 107291106385, secrets 107291106145 e Pages 107291451605 completed/success.

## Limites

Auth/storage são stubs locais; JWT real, PostgREST, conexões simultâneas, migração hospedada e interface não foram certificados. Estado COMPLETE significa somente perfil armazenado com recibo explícito. Omitir dados legados sem novo consentimento não os remove fisicamente. Apagar perfis natais não remove snapshots de produtos nem a conta. Recibos continuam associados ao proprietário.

Releases/policies/editorial/motor/modelos permanecem inalterados. Nenhum modelo homologado, chamada paga, emissor editorial ou entrega produtiva nova. Implementação visual requer ID-02 do Stitch canônico, apresentação de consentimento e QA local próprias.
