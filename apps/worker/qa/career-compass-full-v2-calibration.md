# Bússola integral v2 — calibração privada e fronteira pública

Data: 2026-10-15. Escopo: ponte privada em `apps/worker` e `packages/ai`.
Este registro não é revisão editorial aprovada, recibo de promoção, liberação E5
nem evidência de uma compra entregue. `publication` permanece `blocked`.

## Contrato preparado

| Etapa | Versão e evidência | Estado |
| --- | --- | --- |
| Base natal integral | `atv-career-compass-full-basis/1.0.1`; posições dos 10 corpos, MC, Ascendente/casas quando calculáveis, regente, aspectos e cinco planos de evidência | Calculada e revalidada contra o `WorkflowInput` persistido na rota privada local; sem registro em `createProductCalculators` |
| Vínculo natal da fonte | `atv-career-compass-birth-binding/1.0.0`; digest por run dos seis campos de nascimento | Opcional na projeção pública histórica; obrigatório e conferido com o input na ponte integral privada |
| Contrato editorial IA | `atv-career-compass-editorial/2.0.0`; direção, critério, cinco temas, três relações, experimento e revisão | Schema e inspeção mecânica; geração real e revisão semântica pendentes |
| Avaliação | `atv-product-editorial-evidence/2.0.0` | `basisDigest` inclui `WorkflowInput`, cálculo, fatos e texto; autoridade de revisão separada; sem promoção |
| Entrega integral | `atv-career-compass-full-delivery/1.0.1`; 11 seções, referências técnicas, limites, `deliveryDigest` | Prévia privada, `publication: blocked`, sem `promotionId` e `reviewDigest` |
| Candidato integral | `atv-career-compass-full-candidate/1.0.1`; vínculo da fonte, entrega e avaliação conferidos | Persistência privada, `publication: blocked` |

O teste com cálculo sintético real demonstra recusa de deriva no nascimento ou
contexto, alteração de fatos calculados, aspecto atribuído ao par errado e
repetição do mesmo par. A saída pública histórica de MC não passa na ponte
integral. A fonte parcial anterior continua válida no fluxo público, mas a
ponte integral bloqueia candidatos sem vínculo natal. A validação de geometria acontece na fronteira do worker porque os
fatos editoriais mostram descrições, mas não transportam os extremos estruturados
dos aspectos.

## Comparação E3 com os seis perfis privados v6

Corpus em `apps/web/.trial-qa/compass-v6-saved/`. Todos os JSONs indicam
`atv-career-compass-editorial/6.0.0`, 11 seções e uma leitura privada já
composta pelo site. Os comprimentos abaixo somam apenas `sections[].text`,
sem títulos, evidências ou metadados. Medição refeita após a revisão editorial
de 15/10; o compositor `apps/web/src/lib/trials/reconstruction/compass.ts`
estava em SHA-256
`f6aeb566d14fef02dda49078e88befb83611d9c424fb36d56d9b11a4718717ec`.

| Perfil | SHA-256 do JSON | Caracteres das seções |
| --- | --- | ---: |
| Cerâmica com emprego | `003cdfe89265e721f7cd6b81a02858bcb0f36dbc7d3ad7fe29a342977a4b9766` | 10.244 |
| Nascimento diferente | `5a040a67f580e1268eceb1f4e260bdb36cdd27c7992e0fddd79f576c89262048` | 10.840 |
| Liderança | `b90109248e0d3f391d356a596d389dbcc1fdc7157a0d8eae9e96a9da3b73009a` | 10.608 |
| Lívia / ilustração | `120559502f21a59176666944fc92b582a2a7b48f6ae2fc19f123596634f12b84` | 11.298 |
| Estudo | `371b446307dd18c71eebdb89e907d2ae9c299bf86bbd5e0c8044b625988fc0c3` | 10.692 |
| Sobrecarga | `b3e719839129fa6dfaba9b7f43bcf7bc02597bfe7ca3c8857f755a3728a9399b` | 10.673 |

Inspeção humana limitada dos trechos de abertura, relações e decisão encontrou
adaptação plausível: cerâmica separa esboço, modelagem e queima; Lívia mantém a
renda atual; liderança considera responsabilidades com a equipe; estudo compara
exercícios antes de um curso; sobrecarga aceita pausa/adiamento; o nascimento
alternativo muda a referência astrológica. Isso é observação do **compositor
privado v6**, sujeito ao seu próprio gate. Não demonstra que o worker v2 gerou
qualquer uma dessas leituras nem que alcança a mesma profundidade.

O teste atual do renderer v2 usa texto sintético curto por papel. Ele prova a
composição, vínculos e integridade do envelope, mas não prova a densidade,
precisão, singularidade contextual ou ausência de conteúdo transplantável
observadas no benchmark v6. O schema aceita texto substancial, mas não impõe
profundidade editorial suficiente. A ordem dos cinco temas do renderer v2 é
fixa; o corpus v6 muda a prioridade conforme a situação. Isso precisa ser
avaliado com saídas do próprio contrato v2 antes de qualquer alegação de
paridade.

## Ensaio E3 com o produtor IA real

O runner manual `apps/worker/qa/career-compass-full-ai-lab.mjs` prepara um
`WorkflowInput` inteiramente sintético de cerâmica com emprego, calcula a base
integral, valida 39 fatos e a dimensão do prompt e chama a mesma ponte privada
v2 por `EditorialGateway` em modo Lab. `--dry-run` confirmou 6.927 caracteres
de prompt sob o limite de 32.000, 8.000 tokens máximos de saída e digest do
prompt `1a233940ac8641f4701a30029306c6fc8dffb7f02c1ca81def52d98cd6125701`.
O candidato produzido por `--run`, quando houver configuração, conserva
`publication: blocked` e o relatório privado com saída bruta, telemetria e
recusa/aceite mecânico fica em `%TEMP%/atvna/career-compass-full-v2/`.

Nesta execução, `--run` saiu com código 2 **antes de qualquer chamada externa**:
o ambiente não tinha `GEMINI_API_KEY`, `ATV_AI_LAB_MODEL` nem
`ATV_AI_LAB_FREE_TIER_CONFIRMED=true`. Portanto não há saída real de IA v2,
revisão semântica dela ou aprovação E3. Não foi criado diretório de relatório
no `%TEMP%` nem foi incorporada credencial ou saída sintética gerada aos
arquivos de código/evidência desta etapa. O próximo passo finito é configurar
essas três variáveis de forma privada, escolher um modelo fixo habilitado na
conta, confirmar o Free Tier da conta e executar `node
apps/worker/qa/career-compass-full-ai-lab.mjs --run` com um único perfil
sintético. O relatório resultante requer comparação factual e editorial com o
respectivo cálculo antes de repetir os seis perfis; nenhum aceite desse runner
promove ou emite produto público.

## Dependências finitas para E3–E5

1. **E3 semântica:** gerar seis saídas sintéticas com o perfil IA v2 a partir dos
   seis `WorkflowInput` do corpus, persistir versões e digests, revisar cada
   afirmação contra o cálculo correspondente e comparar contexto, três
   relações, evidências contrárias, custo, limite e ação reversível. Reprovar casos
   genéricos ou que atribuam aptidão, previsão, diagnóstico ou demissão.
2. **E3 autoridade:** coletar revisão independente rastreável com critérios e
   evidências; somente identidade de revisor autenticada pelo servidor pode
   emitir recibo. O `basisDigest` sozinho não autentica ninguém.
3. **E4 execução:** claim, gravação idempotente e leitura privada já estão
   implementados localmente em `20261015101959_career_compass_full_private_candidates.sql`.
   A RPC captura `WorkflowInput` e cálculo parcial do mesmo run/revisão; o worker
   recalcula a base integral e confere contexto, MC e versão do provedor antes
   da geração. O candidato conserva `publication: blocked`; a migration não foi
   aplicada ao banco hospedado e não existe execução hospedada dessa ponte.
4. **E4 apresentação:** após gates, adaptar o leitor e a exportação do produto
   para o envelope integral aprovado, com QA visual do redesign e prova de que
   o PDF corresponde exatamente à leitura emitida. A prévia privada não é
   uma leitura comprada.
5. **E5 liberação:** verificar migrações e política de acesso hospedadas,
   contratação real, emissão, entrega, recibos e aceite do proprietário.
   Registrar uma nova versão pública somente depois desses gates.

O catálogo mantém `career-compass` em `PREPARING`. `createProductCalculators`
ainda escolhe `createPurposeCalculators()` para o caminho público, e a rotina
de candidato persistido recebe apenas o cálculo MC histórico. Nenhuma das
novas funções v2 está registrada no processamento público ou na emissão.
Portanto, o comprador ainda não pode receber a leitura integral v2 via esse
caminho. O candidato 1.8.4 é correção contextual parcial; não deve ser
apresentado como produto completo.

## Fronteira exata da integração pública

Conectar agora `processNextCareerCompassFullCandidate` ao `createProductProcessor`
somente acrescentaria um rascunho privado ao processamento público: ele exige
um produtor IA v2 confiável, mas ainda não possui seis saídas reais revisadas nem
recibo editorial. O emissor atual reconstrói exclusivamente
`atv-career-compass-candidate/1.8.4` com tier `free` e lê a tabela
`career_compass_candidates`; a RPC de emissão consulta essa mesma tabela.
O compositor e o revisor genéricos desse emissor usam o contrato parcial.
O candidato integral usa tier `premium`, tabela `career_compass_full_candidates`
e `atv-career-compass-full-delivery/1.0.1`. A nova tabela não concede leitura ao
comprador, emissão nem mudança do run para `READY`.

O menor caminho de E4/E5, após E3 aprovado, é: (1) vincular o produtor IA v2
autenticado à claim privada; (2) criar revisão dupla, promoção e plano de emissão
versionados que reconstruam **o candidato integral exato**; (3) criar RPC de
emissão sob autoridade editorial que confira esse candidato, seus digests,
liberação e promoção antes de produzir recibo; (4) adaptar leitura/exportação
da compra ao envelope integral e validar visual/PDF e a transação ponta a ponta;
(5) habilitar a nova versão de forma explícita. O cálculo/candidato parcial
histórico permanece imutável, mas não serve de prova de uma leitura integral.

## Verificação local

- `node --test apps/worker/career-compass-full-basis.test.mjs apps/worker/career-compass-full-delivery.test.mjs`: 7/7.
- `node --test apps/worker/product-editorial.test.mjs apps/worker/product-delivery.test.mjs apps/worker/product-runtime.test.mjs apps/worker/career-compass-candidate.test.mjs`: 93/93.
- `pnpm --filter @atv/worker check`: passou.
- `pnpm --filter @atv/ai test`: 132/132.
- `node --test apps/worker/career-compass-full-basis.test.mjs apps/worker/career-compass-full-delivery.test.mjs apps/worker/career-compass-full-six-profile.test.mjs scripts/career-compass-full-candidates-db.test.mjs`: 12/12. Os seis perfis usam produtor sintético; o teste de banco usa PGlite, inclusive a forward fix que revoga as RPCs.
- `node --check apps/worker/qa/career-compass-full-ai-lab.mjs`: passou.
- `node apps/worker/qa/career-compass-full-ai-lab.mjs --dry-run`: fatos e prompt preparados; nenhuma chamada externa.
- `node apps/worker/qa/career-compass-full-ai-lab.mjs --run`: bloqueio de configuração, código 2; nenhuma chamada externa.

Estes resultados verificam contrato e regressões locais. Eles não equivalem a
prova hospedada, ensaio semântico do gerador v2 nem autorização de publicação.
