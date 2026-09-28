# WU-081 — contexto longitudinal mínimo

RUN_ID ATV-20260902-170644Z-01A0630F. Contrato: `docs/contracts/continuity-context.md`.

Implementação pura/off-by-default no domínio: itens curados, relevância explícita, escopo de consentimento atual, fontes próprias disponíveis e contexto limitado sem histórico bruto. Separa relato do usuário, interpretação anterior e cálculo experimental; títulos/seções/fatos vêm da fonte selecionada, sem substituição pelo cliente. Manifesto local separado do payload minimizado. Até 12 itens/fontes e 12.000 bytes UTF-8, sem truncamento.

Validação: 28/28 testes de domínio PASS, incluindo 10 novos testes para as seis famílias, schemas estritos, origem, ordem, cópias, consentimento/revogação, fonte apagada/indisponível, terceiros, relevância, referências inválidas/ambíguas, limites, orçamento UTF-8 e texto adversarial como dado. Typecheck PASS após anotação explícita do tipo de fonte; fontes não exigem input bruto. Logs `test-results/wu081-domain.log`, `wu081-check.log`, `wu081-unit.log`.

Regressão completa PASS: 778 web, 65 worker, 26 AI, 32 astrologia, 28 domínio, 6 integrações e 6 corpus. Não houve UI nova, persistência de memória, envio a modelo, inferência automática, ativação ATV+, migração hospedada, gasto ou promoção. O marcador de dado não confiável não substitui defesa do gateway. Persistência/controle do usuário e revalidação no limite de uso são a próxima fronteira, não capacidades já entregues.
