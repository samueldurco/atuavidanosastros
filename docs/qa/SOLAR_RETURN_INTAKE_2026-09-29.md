# WU194 — Revolução Solar E1: intake privado do ciclo

RUN_ID `ATV-20260902-170644Z-01A0630F`. Produto `solar-return`, E1 local em execução.

O formulário solicita ano, cidade, fuso IANA/UTC e coordenadas do aniversário, mais contexto opcional e consentimento de armazenamento. A data-âncora vem do aniversário civil do perfil natal conferido; em ano não bissexto, 29/02 usa 28/02. O servidor recebe somente o comando declarado. A função SQL lê o perfil natal da própria pessoa, exige hora exata e revisão atual, recusa âncora adulterada, grava recibo privado e encaminha a cópia imutável ao gate comum do produto. O recibo não tem leitura direta pelos papéis cliente; replay da mesma chave e comando é idempotente, e comando distinto com a mesma chave falha.

Provas locais: integração PGlite com perfil de 29/02, cidade do retorno distinta do nascimento, payload de workflow/proveniência, release fechado, revisão/âncora/coordenadas/fuso inválidos, permissões de leitura, replay, autenticação e origem. Suíte Web 72 arquivos/1453 testes PASS; Svelte check 0 erros/0 alertas; lint e formatação dos arquivos afetados PASS. Log completo em `app/test-results/wu194-web-full-test.log`. A abertura de release dentro do teste é sintética e revertida ao final; nenhuma migração ou dado real foi aplicado no ambiente hospedado.

Aceite desta WU: entrada e persistência privadas implementadas e validadas localmente. E1 ainda depende de homologação do motor, licença, dados reais autorizados e verificação hospedada. E2–E5 continuam pendentes; web/PDF final, mandala e doze meses não são produzidos. Gates/default13 permanecem fechados, gasto automático R$0.

Rollback: desabilitar o ponto de entrada e reverter migração/arquivos da WU antes de qualquer pedido real; no ambiente local de teste os dados são descartáveis.
