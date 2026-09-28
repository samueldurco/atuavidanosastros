# Referências explícitas no leitor — WU-087

O leitor PRODUCT_RUN compõe MEM-03 (`58afdd10c4b7484d8167ea5c62b29ee3`) e SH-03 (`157daa1e0776415982d5ab65d092248f`) com os controles de continuidade da WU-086. A área expansível fica após o texto editorial; não substitui a leitura, os limites ou o histórico. Nenhuma consulta acontece ao montar ou expandir: consultar, autorizar e salvar são decisões separadas.

## Candidatos, não autorização

Somente leituras READY/liberadas com cálculo e interpretação oferecem a composição. Fixtures sintéticas do leitor normal não expõem ações; a fixture localhost exclusiva de interação usa transporte interceptado. Troca de proprietário/run/revisão/reviewDigest remonta o componente e descarta estado, aceite e rascunho. Fonte revogada ou modo sintético remove os controles.

O usuário escolhe leitura autorizada e tipo de registro. Referências específicas exigem escolha adicional, sem opção pré-selecionada. Trocar tipo/origem limpa a escolha. Hipóteses usam o índice original da seção (0–63); fatos de ciclos exigem produto da família cycles, tipo calculated e identificador único aceito pelo domínio. Texto da fonte precisa ser não vazio, sem controles proibidos e ter até 1.200 unidades UTF-16; excesso é excluído, nunca resumido ou truncado.

Essa projeção de navegador não contém o status experimental do cálculo e não prova elegibilidade. O servidor/banco relê a fonte canônica, seu status, consentimento, perfil, ownership e gates ao salvar, e novamente antes de preparar contexto. Uma recusa exige consulta/nova decisão, sem contornar a validação com texto fornecido pelo cliente. Referência ao resultado e nota própria continuam disponíveis no fluxo comum.

## Persistência mínima e recuperação

Save envia apenas selector `{kind: hypothesis, sectionIndex}` ou `{kind: cycle, factId}`, ID, runId, revisão e relevância. Não envia cópia de parágrafo, display, evidências ou título como substituto de fonte. Nenhum campo vai a URL, storage, analytics ou logs. Relevância começa não revisada. Ao editar hipótese/ciclo já salvo, preserva origem/selector e permite somente revisar relevância.

Valem os contratos de [gestão](continuity-library.md) e [API](continuity-api.md): CAS, uma tentativa, recibo verificado, releitura após sucesso, recuperação explícita após falha/resultado incerto. Nenhum retry, contexto automático, modelo ou promoção.

## Limites

Não fecha Gate B integral, QA de JWT/PostgREST hospedado ou concorrência externa. WU-088 acrescenta [resumo mínimo no dashboard](continuity-dashboard.md). Auditoria persistente de acesso sem conteúdo, descarte de derivados e executor com revalidação continuam pendentes. Policy permanece default-off; nenhum modelo homologado, migração hospedada, gasto, envio ou ativação ATV+.
