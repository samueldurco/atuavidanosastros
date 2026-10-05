# WU235 — auditoria de dependências no CI

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Requisito: Onda 8 do plano mestre (§15), segurança de dependências e cadeia de fornecimento.

O CI anterior executava instalação, check, lint, testes e build sem reprovar os 21 advisories existentes. O SBOM registra o inventário, mas não substitui a avaliação de vulnerabilidades. A WU234 corrigiu os cinco pacotes envolvidos e zerou a auditoria.

O job `quality` passa a executar `pnpm audit --audit-level=low` imediatamente após a instalação congelada. A auditoria inclui dependências de produção, desenvolvimento e opcionais. Alertas de qualquer severidade e falhas de acesso ao registro impedem a aprovação. Não há exclusões, `continue-on-error`, alteração de permissões nem bypass do registro. Os demais gates permanecem ativos.

## Verificação proporcional

- Lockfile atual: comando exato do gate aprovado, zero vulnerabilidades conhecidas.
- Lockfile anterior (`2c9cc98f558adcf7c9a66ea21d095fa564741061`): cópia dos três arquivos de configuração em pasta ignorada, sem instalação nem execução das dependências; mesmo comando de auditoria com saída JSON retornou exit 1, com 8 alertas altos, 8 moderados e 5 baixos.
- YAML e Markdown verificados pelo Prettier; nenhuma alteração de código, dependências ou banco nesta WU. Os testes locais da WU234 continuam aplicáveis ao mesmo estado do app. O CI remoto executará novamente todos os gates no commit desta alteração; resultado registrado no log canônico e em prova externa após a execução.

Evidências extensas no checkout isolado, em `test-results/wu235-audit.log`, `wu235-baseline-audit.json` e `wu235-format.log`. A auditoria comprova ausência de advisories conhecidos na consulta realizada; não é garantia de ausência de vulnerabilidades desconhecidas.

## Limites

Gasto automático R$0, dados sintéticos e features pagas desativadas. Esta WU não libera produtos nem serviços hospedados. A integração do lockfile da WU234 no checkout principal exige conciliação das alterações paralelas existentes.
