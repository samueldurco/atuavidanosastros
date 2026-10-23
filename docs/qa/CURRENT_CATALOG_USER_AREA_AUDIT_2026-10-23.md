# Catálogo atual e Minha Área — auditoria de 23/10/2026

Escopo: os 19 produtos publicados, nove ferramentas públicas, três planos ATV+ e os percursos de Minha Área. Produtos revogados ficam fora do aceite do catálogo; leitores de resultados históricos mantêm compatibilidade. A referência é a versão vigente de cada produto, com `atv-current-reading/1.0.0` e `atv-current-interpretation-review/1.0.0` para o catálogo atual.

## Correções desta rodada

- A biblioteca compara cada leitura à versão vigente do seu produto. Leituras atuais deixavam de parecer atuais por serem comparadas a uma versão genérica.
- Check-ins usam os intervalos e a versão definidos no método, compartilhados entre leitor e API. O servidor rejeitava marcos oferecidos pela interface.
- O retorno de resultados gratuitos preserva o cursor da biblioteca. Links compartilhados não reabrem leituras arquivadas. Falhas de callback de login aparecem com mensagens fixas, sem refletir conteúdo da URL.
- As ferramentas Meio do Céu e Dinheiro no Mapa são classificadas em Propósito. A migração faz backfill restrito por proprietário, tipo e origem; preserva RLS, conteúdo e a correção de exclusão de contas já aplicada no banco.
- Os calendários validam estruturalmente o contrato de amostras. A ordem das chaves de objetos JSON não é um contrato: o JSONB pode alterá-la e causava rejeição de cálculos válidos na reabertura/exportação. Campos adicionais, ausentes ou alterados continuam rejeitados.
- A leitura semanal evita recalcular efemérides idênticas durante a mesma solicitação e percorre apenas os alvos que podem cruzar cada intervalo. O cache é limitado, exato e isolado por geração. Aspectos distintos entre os mesmos planetas recebem títulos distintos; o gate completo de aprovação continua obrigatório.
- O CI inclui uma tarefa própria de Minha Área, com seis suítes de dashboard, biblioteca, leitores e continuidade. O publicador editorial exige também essa tarefa aprovada para o commit solicitado.

A falha original de salvamento (`23514`, política de aprovação atual ausente do CHECK do banco) foi corrigida antes desta rodada no PR46 e na migração `20261023165415_current_reading_approval_contract`. Essa evidência não é reutilizada como aprovação das alterações posteriores.

## Verificação local

| Verificação | Resultado |
| --- | --- |
| Dashboard, biblioteca, retorno e continuidade | 84 testes E2E aprovados em seis suítes |
| Catálogo atual, 390 e 1440 px | 38 casos aprovados: 19 produtos, capítulos por teclado, acessibilidade, limites da arte e overflow |
| Ferramentas gratuitas e calendários | Oito casos E2E aprovados |
| Regressões focais de dashboard/API | 71 testes unitários aprovados |
| Persistência JSONB dos dois calendários | Dois testes aprovados, incluindo aprovação, composição, TXT e rejeição de adulterações |
| Classificação e exclusão de resultados | Sete testes DB aprovados, com isolamento, idempotência, rollback e reaplicação |
| PDFs e apresentação | 27 testes aprovados; 19 PDFs reais, 178 páginas, nenhuma palavra fora dos limites |
| Gate do publicador | Seis testes aprovados; ausência de `user-area` impede publicação |
| Semana e cache de efemérides | 21 testes worker/cache e 16 de composição aprovados; diferencial integral preserva os cálculos em duas semanas |

A inspeção visual dos PDFs cobriu primeira, segunda e última página de cada produto, com ampliações de mandalas e cartas. Não corresponde a inspeção visual de todas as 178 páginas.

## Provas hospedadas e release

A primeira matriz hospedada revelou falhas adicionais que precisam de comprovação após a publicação. O Dossiê dos Sonhos foi reprovado por uma data inconsistente da própria fixture; corrigida a fixture, passou sem mudança no produto. A Mandala Astrológica usa 12 áreas e uma carta central, total de 13 cartas; a antiga expectativa de 12 no probe foi corrigida.

As falhas de produto encontradas nessa matriz foram a interrupção da leitura semanal no limite de CPU e a rejeição, após persistência, de dois calendários válidos. A amostra semanal também revelou colisões de títulos que impediam aprovação em determinadas semanas. Não se relaxou o gate editorial para contornar essas falhas.

Os identificadores finais de CI, migração, runtime, deploy e matriz hospedada ficam no registro de execução, junto das evidências completas, em:

`C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/current-interpretation-20261019/current-user-journey-audit-20261023.md`

Testes hospedados usam contas sintéticas isoladas, sem envio de email ou cobrança, com revogação e verificação de limpeza. Esta rodada preserva os dados do proprietário; não repete a limpeza anterior de Minha Área.

## Limites de aceite

O acesso privado para avaliação não equivale a uma compra. Hotmart permanece desabilitada: faltam preços/condições/IDs externos e a integração validada de reconciliação de pagamentos e direitos, inclusive duplicidade, eventos fora de ordem, reembolso e revogação. O PR37 comercial não integra esta correção e continua separado dos gates privados.

O aceite E5 é do proprietário: utilidade, profundidade da leitura, voz e experiência percebidas por produto. Aprovação técnica e provas sintéticas ajudam essa avaliação, sem atribuir concordância pessoal ou comprovar um ciclo humano de 30 dias do ATV+.
