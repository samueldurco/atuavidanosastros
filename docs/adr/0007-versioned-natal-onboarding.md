# ADR 0007 — Onboarding natal versionado

Status: aceito para implementação local; ativação hospedada pendente.

## Decisão

Usar `profiles.onboarding_revision` como concorrência otimista, `natal_profiles` como versões imutáveis e recibos append-only específicos em `natal_storage_consents`. Duas RPCs security-definer com search_path vazio derivam a identidade da sessão e são os únicos caminhos de leitura composta/escrita do fluxo. O consentimento de armazenamento natal não implica continuidade, marketing, IA ou dados de terceiros.

Remover os caminhos authenticated de escrita direta preexistentes em profiles/natal_profiles: RLS por proprietário, sozinha, não impede o proprietário de forjar conclusão ou ignorar consentimento/versionamento. Preservar leitura própria sob RLS e negar perfis soft-deleted no novo fluxo.

## Consequências

Correções criam novas versões, mantendo resultados existentes estáveis. Exclusão natal remove todas as versões, mas não apaga snapshots de produtos já solicitados; a experiência deve distinguir claramente as duas ações. Horário desconhecido não é preenchido automaticamente. UTC explícito resolve ambiguidades de fuso; não há certificação de tzdata histórica.

Recibos são associados à conta e não anônimos. Operação e apresentação de privacidade requerem revisão antes do deploy. Não migrar legado para consentimento implícito. Roll-forward de contenção revoga apenas execute de escrita, preservando leitura e evidência; nunca restaurar o bypass anterior.

Contrato: [natal-onboarding](../contracts/natal-onboarding.md). Nenhum release, homologação de motor/modelo, gasto ou permissão comercial é alterado.
