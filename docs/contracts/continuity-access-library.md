# Consulta de acessos na Biblioteca — WU-091

Extensão funcional MEM-02/SH-02 do Atlas 3.1, sem novos tokens. Componente isolado na Biblioteca autenticada, nunca no preview público; fixture somente localhost. Não seleciona contexto nem executa modelo.

## Consulta e minimização

A consulta exige ação explícita: POST vazio, sessão da mesma origem, no-store, redirect error e timeout de 15 segundos. O parser compartilhado valida o payload inteiro. Exibe 25 registros inicialmente; expansão local não consulta o servidor. Nova consulta reinicia a paginação. Sem conteúdo, identificadores ou escopo em armazenamento do navegador, URL, logs ou analytics.

Datas indicam UTC. Identificadores e revisões ficam em detalhes expansíveis; não há reconstrução de títulos ou texto das fontes. Seleção registrada no SQL não significa uso por IA. Consulta vazia não prova ausência de seleções anteriores; expiração lógica não comprova descarte físico. Ocultar ou sair remove a visualização. Consulta não concede consentimento.

## Limpeza e recuperação

Snapshot válido e diálogo explícito precedem a limpeza de todos os registros próprios ainda armazenados, inclusive expirados e novos desde a consulta. A ação não pode ser desfeita. Notas, leituras e consentimentos permanecem; limpar não revoga autorização nem impede novos registros. Uma consulta vazia também permite a limpeza de registros expirados.

Uma única escrita aceita apenas recibo estrito com inteiro não negativo. Sucesso consulta novamente: novos registros podem aparecer. Falha HTTP, timeout, recibo inválido ou resposta perdida elimina o snapshot e exige consulta e nova decisão, sem retry automático. Falha na consulta após sucesso também bloqueia nova escrita. Busy evita duplicidade local; autorização continua no RPC.

Diálogo contém foco, aceita Escape e restaura o acionador; após tentativa de escrita o foco retorna à consulta. Status/alertas acessíveis, alvos de 44px e reflow mobile. Não introduz download, e-mail, policy ou modelo.

## Limites

Testes de navegador usam transporte simulado e dados sintéticos, não certificam JWT/PostgREST hospedados. Evidência SQL/HTTP da WU-090 é separada. Perfil soft-deleted não consulta pela UI; a capacidade de limpeza do SQL/API permanece, mas não está disponível por esta tela sem snapshot. Retenção de produção continua NULL, sem scheduler, descarte de derivados ou executor. Gate B integral permanece parcial.
