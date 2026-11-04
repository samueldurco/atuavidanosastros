# P06 — preflight hospedado somente leitura

RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Consulta realizada em 04/11/2026, entre 11:59:37Z e 12:04:51Z
(08:59:37–09:04:51, UTC−03). Este registro descreve o estado observado nesse
intervalo, não uma autorização ou uma publicação do P06.

## Resultado

**Infraestrutura P06 ainda desligada e incompleta no ambiente hospedado.**
As duas tabelas P06 não existem; os bindings WhatsApp não estão configurados;
as três flags P06 estão **ausentes**, e não definidas como a string `false`.
Nenhuma está habilitada. O candidato local exige a string `true` para abrir os
gates; ausência permanece fechada. O `wrangler.jsonc` do candidato declara as
três como `false`, mas isso ainda não representa uma configuração publicada.

A janela exclusiva de publicação P02 permanece ativa. O log canônico registra
P02.03.01 (reserva), P02.03.02 (três migrations P02 aplicadas) e, na última entrada
P02 lida, P02.03.04 às 09:01:44−03, preparação da atualização do runtime Edge e
do front-end. A produção Pages observada continua no commit publicado por P01.
Este preflight não alterou ou reservou a janela e não examinou dados dos testes
P02. Os lançamentos P02 gratuitos não são elegíveis ao catálogo comercial P06.

## Supabase

Projeto: `irgnhvouvzyoqfmltrna`. Consulta via MCP dedicado, apenas metadados de
catálogo PostgreSQL; nenhum registro de usuário foi consultado.

Instante retornado pelo banco: `2026-11-04 11:59:37.332679+00`.

| Objeto                                    | `to_regclass` | RLS/ACL hospedadas            |
| ----------------------------------------- | ------------- | ----------------------------- |
| `public.whatsapp_consultation_sessions`   | `NULL`        | Não aplicável: tabela ausente |
| `public.whatsapp_consultation_dispatches` | `NULL`        | Não aplicável: tabela ausente |

Consulta executada:

```sql
select current_timestamp as checked_at,
       x.object_name,
       to_regclass(x.object_name)::text as installed_name,
       c.relrowsecurity,
       c.relforcerowsecurity,
       c.relacl::text as acl
from (values ('public.whatsapp_consultation_sessions'),
             ('public.whatsapp_consultation_dispatches')) as x(object_name)
left join pg_class c on c.oid = to_regclass(x.object_name);
```

A migration candidata
`supabase/migrations/20261104104910_whatsapp_consultation_dispatch.sql` prevê RLS,
revogação de acesso de `public`/`anon`/`authenticated` e acesso de `service_role`.
Isso é implementação local; **não foi aplicada nesta verificação** e não há ACL
P06 hospedada a homologar enquanto os objetos estiverem ausentes.

## Cloudflare Pages

Projeto: `atuavidanosastros`. Consulta GET à API dedicada, autenticada pela
capacidade existente da CLI Wrangler. A credencial foi capturada somente em
memória; logs em disco e métricas da invocação foram desativados. A saída foi
limitada a metadados, valores de gates e presença/tipo de bindings.

Instante da consulta: `2026-11-04T12:04:51.902Z`.

| Metadado                                      | Valor observado                            |
| --------------------------------------------- | ------------------------------------------ |
| Ambiente e branch                             | `production` / `main`                      |
| Deploy canônico e último deploy de produção   | `ddb87909-3519-429c-bc3f-bb095929bf8b`     |
| SHA                                           | `2c4e3c34ae10d1cf314e315cb598cc32b5ba323b` |
| Última etapa / estado                         | `deploy` / `success`                       |
| Criado em                                     | `2026-11-04T10:52:16.653834Z`              |
| Etapa concluída em                            | `2026-11-04T10:53:20.8592Z`                |
| Domínio `atuavidanosastros.com.br` no projeto | Presente                                   |

Bindings de `deployment_configs.production.env_vars`:

| Binding                                     | Presença / tipo / valor permitido na evidência |
| ------------------------------------------- | ---------------------------------------------- |
| `FEATURE_WHATSAPP_WEBHOOK`                  | Ausente; nenhum valor remoto `false` ou `true` |
| `FEATURE_WHATSAPP_CONSULTATION`             | Ausente; nenhum valor remoto `false` ou `true` |
| `FEATURE_WHATSAPP_PUBLIC_ENTRY`             | Ausente; nenhum valor remoto `false` ou `true` |
| `FEATURE_ATV_PLUS_COMMERCIAL`               | Presente / `plain_text` / `false`              |
| `FEATURE_HOTMART_LIVE`                      | Presente / `plain_text` / `false`              |
| `AUTOMATIC_SPEND_CAP_BRL`                   | Presente / `plain_text` / `0`                  |
| `WHATSAPP_ACCESS_TOKEN`                     | Ausente                                        |
| `WHATSAPP_APP_SECRET`                       | Ausente                                        |
| `WHATSAPP_WABA_ID`                          | Ausente                                        |
| `WHATSAPP_PHONE_NUMBER_ID`                  | Ausente                                        |
| `WHATSAPP_GRAPH_VERSION`                    | Ausente                                        |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`             | Ausente                                        |
| `WHATSAPP_COMMERCIAL_NUMBER`                | Ausente                                        |
| `WHATSAPP_CONSULTATION_SUBJECT_SECRET`      | Ausente                                        |
| `WHATSAPP_CONSULTATION_VERIFIED_AT`         | Ausente                                        |
| `WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED` | Ausente                                        |
| `SUPABASE_SERVICE_ROLE_KEY`                 | Presente / `secret_text`; valor não registrado |
| `PUBLIC_SUPABASE_URL`                       | Presente / `plain_text`; valor não registrado  |

Não havia outros nomes `WHATSAPP_*` na configuração de produção retornada.
`WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED` continua sendo prova de transporte
WhatsApp com custo R$ 0 na janela de atendimento; não habilita produtos gratuitos.

## Limites e sequência pendente

Nenhum browser, DDL, deploy, alteração de flag, mensagem WhatsApp, nova inspeção
Meta, compra ou recurso pago foi utilizado. Nenhum segredo ou dado pessoal foi
incluído nesta evidência. Não foi iniciado helper persistente, build ou servidor
local para esta consulta; os processos de captura terminaram.

P06 ainda precisa concluir QA/CI e aguardar a liberação da janela P02 antes de
qualquer publicação. A futura ativação exige migração revisada, bindings válidos,
homologação conjunta do canal e da prova de transporte sem gasto, além de ofertas
pagas autorizadas com preço positivo e contratação vigente. Ausência de qualquer
prova mantém a entrada ou a oferta fechada. Este documento não atesta credencial
Meta atual, entrega real nem prontidão comercial.
