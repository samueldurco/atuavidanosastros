# API privada de gestão de continuidade — WU-084

Seis endpoints POST de mesma origem usam a sessão verificada (`getClaims`) e o cliente Supabase da própria sessão. Nenhuma credencial service_role, chamada a modelo, ativação ATV+ ou migração hospedada. A policy do banco permanece default-off. Esta API é de gestão: não entrega o contexto selecionado, manifesto ou auditoria em memória do preparador ao navegador. WU-090 acrescenta consulta/limpeza dos registros SQL de acesso, somente metadados e sem conceder autorização de uso.

| Endpoint | JSON exato | Resposta |
| --- | --- | --- |
| `/api/continuity/read` | `{}` | enabled, consent (version/purpose/state/runIds/revision), items próprios (id/runId/productId/relevance/selection/revision/updatedAt) |
| `/api/continuity/consent` | version=`atv-continuity-consent/1`, purpose=`reading-context`, expectedRevision, runIds, granted | revision |
| `/api/continuity/save` | id, runId, expectedRevision, relevance, selection | revision |
| `/api/continuity/delete` | id | deleted (false se ausente/alheio) |
| `/api/continuity/access` | `{}` | version=`atv-continuity-access/1`, events próprios não expirados: IDs, revisões, finalidade/resultado fixos, timestamps e referências ordenadas |
| `/api/continuity/clear-access` | `{}` | deleted (inteiro não negativo; somente registros de acesso, nunca notas/consentimento) |

Origin deve coincidir exatamente com a origem da requisição; Sec-Fetch-Site cross-site é recusado. Query strings e chaves extras são recusadas, IDs/textos nunca entram em URLs. UUIDs minúsculos, revisões inteiras de 0 a 2.147.483.646 para mutação; grant exige 1–100 runs únicos, revogação exige lista vazia. Seletores usam o parser estrito do domínio, sem conteúdo de interpretação enviado pelo cliente como substituto da fonte.

Corpo JSON limitado a 8.192 bytes UTF-8; JSON/UTF-8/content-type inválidos são recusados. O leitor limita a projeção a 100 itens e 196.608 unidades UTF-16 serializadas, valida ownership, duplicatas, versões, revisões e timestamps, e remove ownerId/version dos itens na resposta. Esse teto é validação pós-transporte, não limite de bytes da resposta de rede. Consulta funciona desligada/revogada para permitir gestão; **não atesta disponibilidade das fontes nem concede uso por IA**.

RPCs recebem AbortSignal de 10 segundos; respostas tardias são recusadas. Autenticação anterior não está incluída nesse prazo. Não há retry automático, cache, logging de texto ou analytics. Todas as respostas do handler têm private/no-store, no-referrer e noindex/nofollow. Erros conhecidos são normalizados; exceções, SQL e mensagens desconhecidas viram 503 genérico. O adapter não garante o cancelamento de um transporte que ignore AbortSignal.

Consulta de acessos aceita no máximo 1.000 eventos × 12 referências e 3.145.728 unidades UTF-16 serializadas após transporte. Parser de chaves exatas, UUIDs, revisões positivas, timestamps/expiração posterior, duplicatas e revisões consistentes por fonte; resposta malformada falha inteira, sem truncar. Ownership é imposto pela RPC da sessão, não inferido pelo parser de metadados. Não retorna textos, input, interpretação, payload de provider ou contexto. Não atribui ao registro SQL significado de consumo pelo modelo. Perfil soft-deleted não pode inspecionar, mas pode limpar os próprios registros. Desligamento/revogação não removem esses controles. A limpeza inclui expirados ainda fisicamente presentes.

## Conflitos e recuperação

Consentimento e save usam compare-and-swap; somente recibo inteiro exatamente expectedRevision+1 é aceito. Uma resposta perdida pode ocorrer **depois do commit**: 503 não significa que nada foi gravado. Reler `/read`, mostrar estado atual e colher nova decisão; jamais repetir cegamente a mutação nem sobrescrever com dados obsoletos. Revogação não apaga notas; exclusão continua disponível com a feature desligada. Delete ausente é idempotente.

Após falha ambígua de `clear-access`, reler `/access`: não repetir a limpeza automaticamente, pois novos acessos podem ter sido registrados desde a ação original. Limpeza não revoga consentimento nem impede novos registros em seleções futuras autorizadas. Não expor purga global nem configuração de retenção pela API.

## Limites explícitos

Testes usam handlers reais com claims/porta RPC simulados e PostgreSQL local PGlite. Não certificam JWT/PostgREST hospedados, CSRF em navegador implantado ou concorrência multi-conexão. WU-086 acrescenta [gestão na Biblioteca](continuity-library.md); WU-089 acrescenta [auditoria SQL sem conteúdo](continuity-access.md), WU-090 esta API e WU-091 [consulta e limpeza na Biblioteca](continuity-access-library.md). Faltam retenção física operacional, descarte de derivados e executor. A leitura selecionada rejeita perfil soft-deleted; WU-085 acrescenta [guard de ciclo de vida](continuity-profile-lifecycle.md) para grant/save preservando revogação/exclusão. Nenhum modelo homologado ou publicação permitida.
