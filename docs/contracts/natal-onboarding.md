# Onboarding natal — contrato v1

Status: contrato/API/persistência e interface recuperável em `/conta/nascimento`, validados localmente. Não é ativação hospedada, certificação do motor ou autorização de processamento. Nenhum dado real deve ser usado na validação.

## Jornada e dados

`GET /api/onboarding` recupera apenas o perfil atual da sessão autenticada, revisão e estado. `POST` recebe exatamente `version: atv-onboarding/1`, `expectedRevision` inteiro e `action`:

- `begin`: inicia `IN_PROGRESS`, sem coletar dados natais. Não rebaixa um perfil completo.
- `save-natal`: exige `natal` completo e `consent: {storage: true, policyVersion: atv-natal-storage/1}`. Salva nova versão imutável, desativa a anterior e marca `COMPLETE`, atomicamente.
- `forget-natal`: apaga todas as versões natais do proprietário, registra revogação e volta a `IN_PROGRESS`. Não apaga resultados/Biblioteca que possuam snapshots próprios: a interface deverá explicar esse escopo antes da ação e oferecer seus fluxos específicos de exclusão. Não é exclusão da conta.

`natal` contém `localDateTime`, `utcInstant`, `timezone`, latitude/longitude numéricas, `locationSource` (80 caracteres), `locationLabel` (200), `countryCode` (dois caracteres ASCII maiúsculos, não validação de catálogo geográfico) e `timePrecision: EXACT | APPROXIMATE`. Data/hora exige segundos, fração opcional de até três dígitos; UTC termina em Z. A resposta normaliza a fração em três dígitos. A versão natal usa a revisão da operação, pode conter lacunas e não é reutilizada depois de apagar os perfis.

Não há horário padrão, geocodificação automática, inferência de DST, consulta de terceiros, mapa ou interpretação neste endpoint. Horário desconhecido deixa a jornada em andamento; não permite concluir o cadastro natal. `APPROXIMATE` preserva explicitamente a incerteza e não autoriza tratá-lo como exato em produtos futuros. O estado `COMPLETE` diz apenas que o perfil foi armazenado, nunca que um produto foi homologado.

## Validação e segurança

SQL valida novamente schema, consentimento, limites, calendário e correspondência exata local/UTC. Aceita UTC e identificador regional IANA disponível no PostgreSQL; não aceita abreviaturas ou offsets livres. UTC resolve folds; gaps e divergências são recusados. Intervalo UTC: 1900-01-01 até 2099-12-31T23:59:59.999Z. A base de fusos PostgreSQL é não fixada; a entrada e o instante resolvido são preservados. Isso não certifica dados históricos nem substitui a validação do adaptador determinístico ao calcular.

O proprietário vem de `auth.uid()`, nunca do corpo ou parâmetro. A API verifica claims, mesma origem nas mutações, JSON até 4096 bytes e retorna `private, no-store`, `no-referrer`, `noindex, nofollow`. Não registra payload nem erro bruto. RPCs não são concedidas a anon/service_role; escritores diretos authenticated de profiles/natal_profiles foram removidos para impedir bypass. Leituras diretas natais continuam sob RLS. Perfis soft-deleted não são recuperados nem alterados pelo fluxo.

Lock na linha do perfil + revisão esperada previnem perda silenciosa entre abas. Revisão desatualizada retorna `409 revision_conflict`; repetir a operação não cria outra versão. Após falha de rede, recuperar antes de propor novo envio; não reenviar automaticamente com revisão atualizada. A evidência local cobre interleaving sequencial, não concorrência de conexões hospedadas.

Recibos em `natal_storage_consents` guardam proprietário, revisão, autorização/revogação, versão de política e instante, sem dados de nascimento. Ainda são dados associados à conta, não registros anônimos. Não concedem marketing, analytics, continuidade ATV+, acesso a IA ou uso de dados de parceiro. Consentimento é específico para persistir/reutilizar o próprio perfil; sua apresentação e política de retenção precisam de revisão antes de ativação hospedada. Recibos são removidos em cascata quando o perfil da conta é fisicamente excluído.

## Migração, contenção e pendências

Migração `20260923180000_natal_onboarding.sql`, local apenas. Coluna/recibos são aditivos; o endurecimento de permissões é deliberado e exige callers usando RPC antes de eventual deploy. Perfis legados sem recibo não são convertidos silenciosamente em novo consentimento: a RPC omite seus dados e pede novo cadastro; as linhas legadas permanecem até correção/exclusão explícita.

`supabase/forward-fixes/disable_natal_onboarding_writes.sql` suspende escritas mantendo recuperação e dados. Não restaura bypass. Testado contra banco local real. Implantação hospedada, JWT/PostgREST real, geocodificação, integração dashboard/produtos e exclusão integral da conta são pendentes. Todos os gates de produto/editorial permanecem inalterados.

## Interface e recuperação

A interface ID-02 usa consentimento desmarcado, precisão explícita e entrada manual de local, coordenadas, fuso IANA e deslocamento UTC. Não inventa geocodificação, horário ou progresso percentual. Hora desconhecida permite apenas iniciar a jornada, preservando o rascunho em memória. Não armazena dados natais no storage do navegador. A recuperação bem-sucedida substitui o rascunho pelo estado salvo e exige novo consentimento para salvar.

Enquanto uma operação está pendente, ou após resultado incerto/conflito/sessão expirada/resposta inválida, novas mutações ficam bloqueadas. Falha de recuperação não desbloqueia o formulário; somente GET válido permite continuar. Não há reenvio automático, inclusive se o servidor já confirmou a gravação antes de a resposta se perder. Exclusão tem confirmação com escopo explícito, Escape e restauração de foco. QA local: `docs/qa/NATAL_ONBOARDING_UI_2026-09-24.md`.
