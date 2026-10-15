# Diário de Sonhos — 30 Dias: implementação e revisão privada

Data: 2026-10-15. Checkout: `arquitetura-integral-20261015`.

Escopo autorizado nesta conversa: registros independentes ao longo de 30 dias reais e uma análise integrada ao final. Interpretações individuais continuam como ofertas próprias. A decisão atual substitui a exclusão de Sonhos da reconstrução anterior; não modifica os contratos históricos já salvos.

## Entrega e acesso

- `/testar-produtos/dream-atlas` permite iniciar um ciclo com consentimento, guardar, editar, recuperar, selecionar e remover relatos, sem comprar ou gerar uma interpretação individual. Usa a autorização privada existente.
- O início e a liberação após 30 × 24 horas são definidos no servidor. As datas dos relatos seguem o calendário UTC informado na interface. Campos de datas, IDs, revisão, seleção e limites são conferidos novamente no banco.
- `/testar-produtos/dream-atlas/exemplo` exige acesso privado e a concessão `owner_evaluation`. Contém oito relatos inteiramente fictícios em um período de exemplo. Não cria ciclo, relato, leitura, aceite ou cobrança na conta. Capítulos e marcadores são temporários. O PDF declara a demonstração em todas as páginas.
- A demonstração usa o mesmo compositor e o mesmo avaliador da análise final. Seu período fixo nunca é usado para retroagir um diário real. A autorização comercial e o aceite pessoal E5 continuam pendentes.

## E1–E4: evidência finita

**E1 — Entrada, método e contrato.** Relatos consentidos são a fonte; emoções e associações são declarações do usuário. O cálculo organiza cinco intervalos, datas, quantidade e recorrências literais. A síntese compara o conjunto, diferenças de contexto e limites de inferência; mantém os relatos completos como apêndice. Não aplica dicionário universal de sonhos, diagnóstico ou previsão. Edição de cálculo e leitura `atv-private-dream-atlas/2.0.0`; nomes canônicos têm revisão de apresentação separada. Edições anteriores permanecem reconhecidas.

**E2 — Dependência dos fatos e qualidade.** Os testes demonstram que trocar as associações muda a comparação e que alterações em datas, revisões, fatos ou texto final invalidam a aprovação. Uma amostra concentrada em um intervalo recusa descrever evolução de 30 dias. Registros excluídos não entram nos fatos, entrega ou PDF. Revisão manual do exemplo verificou correspondência de todas as oito cenas, datas, emoções e associações; recorrências não são tratadas como prova de causa comum. Orientações repetidas foram condensadas para uma única passagem. Os cinco intervalos e os relatos usados são consultáveis separadamente.

**E3 — Persistência e autorização.** A migração `20261015152322_private_dream_atlas_cycles.sql` adiciona ciclos e vínculo opcional dos relatos sem reescrever dados anteriores. A RLS restringe leitura ao proprietário com acesso vigente; mutações passam por RPCs. Chaves de repetição e revisões evitam duplicações e edições obsoletas. O trigger de inserção da análise recusa antecipação mesmo pela escrita administrativa, valida o snapshot completo contra os relatos autorizados sob lock e permite uma única análise por ciclo. Apagar o relato original após concluir não altera o snapshot histórico; a interface informa esse efeito.

**E4 — Verificação local.**

- PGlite com migração real: **9/9** casos aprovados, incluindo isolamento entre contas, revogação, autorização por relato, persistência independente, limites de texto, datas, revisão, antecipação, snapshot, duplicação e preservação da análise após excluir o original. Uma segunda revisão independente confirmou esses resultados e inspecionou locks/índice único. Os testes são sequenciais; não alegam prova com duas conexões concorrentes.
- Testes de leitura/PDF: **6/6**; seleção no servidor: **3/3**; demonstração privada: **2/2**. Com os dois arquivos editoriais ajustados, a execução focal teve **22/22** aprovações. Após a redução final de copy, os **11** casos de Diário foram repetidos e aprovados.
- A autorização do exemplo recusa anônimo, falta/revogação da concessão e falha de infraestrutura. Não acessa tabelas pessoais. A aprovação normal cobre a demonstração; texto fictício consta de todas as fontes.
- PDF final do exemplo: **5 páginas** renderizadas com Poppler e inspecionadas; texto extraído com pypdf confirmou o aviso em todas as páginas e os oito relatos. Sem corte ou sobreposição observados. As páginas preservam capa, capítulos, pergunta/prática, método e paginação.
- Logs e artefatos locais: `test-results/private-dream-atlas-db.log`, `test-results/dream-atlas-final-unit.log`, `test-results/dream-atlas-reading-final.log` e `test-results/dream-atlas/` (PDF, extração e pranchas). São evidências sintéticas; não são diários de usuários nem aceite do proprietário.

## Limites desta revisão

Esta evidência cobre implementação e validação local. A execução principal coordena check/lint/build, integração hospedada, aplicação da migração e autorização real da conta. A verificação visual interativa será complementada sobre o servidor integrado estável. Nenhuma concessão real ou preço foi cadastrado por esta frente. O período real nunca foi abreviado; somente fixtures declaradas usam datas anteriores.
