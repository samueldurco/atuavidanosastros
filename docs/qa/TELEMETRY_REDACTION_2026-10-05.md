# Sanitização aninhada de telemetria — 05/10/2026

WU240 / RUN_ID `ATV-20260902-170644Z-01A0630F`. Requisito existente do plano §11.2, §0.6 e Onda 8: segurança e privacidade da observabilidade.

## Falha e alteração

`packages/observability/src/index.ts` sanitizava somente as chaves do primeiro nível. A mesma política de campos sensíveis falhava dentro de objetos e arrays: `context.authorization` e `items[].email` permaneciam no resultado. A reprodução usou exclusivamente marcadores sintéticos.

A função existente agora copia recursivamente atributos JSON, aplicando a política vigente em cada objeto. Preserva valores seguros, estrutura de listas e referências repetidas sem mutar a entrada. Referências circulares e objetos a partir da profundidade 32 recebem `[REDACTED]`, evitando recursão ilimitada. Funções recebem o mesmo marcador, impedindo que um `toJSON` copiado substitua o resultado sanitizado durante a serialização. A cópia usa propriedades próprias, inclusive `__proto__`, sem alterar protótipos.

Não foram adicionados transporte, coletor, provedor, evento, registro de payload ou gasto automático. Esse utilitário ainda não comprova observabilidade/alertas hospedados.

## Aceite

Seis testes do módulo cobrem a política existente, campos aninhados/arrays, imutabilidade, ciclos/referências repetidas, profundidade excessiva, hooks de serialização e chaves incomuns. A mesma suíte foi aplicada ao módulo anterior, em diretório ignorado: 1 aprovação e 5 falhas. A suíte final passa 6/6, sem exclusões. Check e lint do módulo também passam.

Check, lint e build globais concluíram com código 0; o check web informou zero erros e zero avisos. Evidências locais extensas no checkout isolado `test-results/`: `wu240-before.log`, `wu240-after.log`, `wu240-check.log`, `wu240-lint.log` e `wu240-build.log`. CI do commit exato e seus resultados serão registrados no log canônico externo após conclusão.

## Limites

A sanitização continua baseada nos nomes de campos existentes. Dados pessoais ou segredos em texto livre sob uma chave permitida não são detectados; não devem ser enviados à telemetria. Atributos devem ser dados JSON, não instâncias de classes com comportamento/getters. Esta correção não aprova conteúdo editorial, produtos, integração financeira, infraestrutura ou release. Gates e R$0 preservados.
