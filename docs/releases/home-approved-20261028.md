# Home aprovada — 28/10/2026

Escopo autorizado: concluir e publicar a reformulação aprovada em
`PLANO_REFORMULACAO_HOME_E_JORNADAS_2026-10-20.md`, sem retomar a fila mestra.
A base inclui a Loja real da PR #61. Nenhuma arte, disponibilidade, preço ou
estoque fictício foi acrescentado ao catálogo físico.

## Entrega

- Marca completa, caminhos equivalentes, nove ferramentas na home e painéis
  abaixo da linha selecionada, nas três larguras responsivas.
- Vitrine de leituras avulsas e ATV+, com capas/apresentações próprias e três
  banners controláveis. Movimento pausa por foco, interação, visibilidade,
  ferramenta aberta e preferência de movimento reduzido.
- Seis universos, Revista por conteúdo publicado, Loja com produtos e artes do
  catálogo vigente; navegação compacta e rodapé de apoio.
- Após o resultado gratuito, uma oferta do funil. O PDF fica depois da oferta
  na landing e usa somente a leitura canônica do servidor. O identificador
  preserva a escolha de um sonho antigo até o download.
- Cotas persistidas no servidor, perfil compartilhado, correções em janela de
  24 horas, renovação diária em America/Sao_Paulo, reconciliação após login e
  histórico de sonhos com paginação e edição do registro escolhido.
- Eventos analíticos sujeitos ao consentimento, sem dados pessoais de leitura.
- Escolha opcional e inicialmente desmarcada para receber novidades, salva
  separadamente na conta confirmada. O download não depende dessa escolha;
  registrar consentimento não inicia campanhas nem ativa envio de e-mail.
- PDF do Horóscopo pela referência pública e revisão editorial consultadas.
  A exportação revalida a admissão e recusa uma revisão substituída ou revogada,
  sem trocar o conteúdo silenciosamente nem consumir cota pessoal.

## Limites preservados

As apresentações de produtos digitais são composições visuais; o catálogo é
a autoridade para disponibilidade. Produtos em preparação não anunciam compra.
ATV+, Hotmart, checkout físico, IA paga e gasto automático mantêm os gates
existentes. A home não cria liberações comerciais.

A confirmação por código possui integração e estados de interface, mas
`FEATURE_MAGIC_LINK=false` impede envio até SMTP/template e entrega passarem
na validação específica. Contas já confirmadas podem baixar o PDF após login.
Não há código local de demonstração nem simulação disfarçada de envio.

O controle anônimo depende de cookie assinado e tem a limitação nominal
documentada no plano. Não comprova identidade civil. Dados de testes são
sintéticos e usados apenas nos bancos isolados locais/CI.

## Validação e publicação

Evidências completas fora do repositório:
`C:/ATVNA/docs/20-produto/home-prototipo-20261028/evidencias/`.
Testes verificam cálculos, estado/cotas SQL, ownership de PDF/histórico,
autenticação, assinatura do runtime, acessibilidade, painéis, menus e banners.
O E2E usa a migração real em PostgreSQL embutido isolado e transporte RPC local;
isso não substitui a inspeção dos privilégios e bindings hospedados.

Ordem de release: migração aditiva isolada; CI do commit; Pages da aplicação;
runtime de cálculos que exige assinatura. Aplicar somente a migração desta
entrega, sem executar o conjunto pendente de migrações de outras frentes.
O runtime anterior aceita chamadas assinadas, permitindo a transição sem
interromper a versão anterior do Pages.

Para recuar a apresentação, preservar a API que aplica as cotas ou suspender
temporariamente novos cálculos. Não restaurar uma versão que contorne o ledger.
Conservar tabelas, vínculos e leituras existentes; não apagar dados de uso.
O runbook `docs/runbooks/free-tool-quota-ledger-recovery.md` e o teste SQL
exercitam a recuperação das funções por forward-fix e preservação dos registros.
Credenciais permanecem em bindings e nunca entram no relatório.

Publicação só é concluída após CI, identificação do commit no deployment de
produção e postflight no domínio oficial. O protótipo local não é prova de
publicação.

Os destaques de catálogo usam `home-publications.ts`, unido ao catálogo vigente
em cada carregamento. A data das três apresentações da Loja é a conclusão real
do deployment `927e9d31-5ec4-40e1-9e3d-f49781da1be9` da coleção publicada pela
PR #61; não representa primeira venda ou estoque. A evidência de origem está
em `shop-publication-source.json`. Publicações futuras exigem registro com
data/fonte reais, imagem aprovada e elegibilidade atual. Hoje não há lançamento
digital elegível; as capas permanecem como apresentações “Em preparação”.
