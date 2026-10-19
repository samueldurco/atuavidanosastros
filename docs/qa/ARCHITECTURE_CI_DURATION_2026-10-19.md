# Duração do CI de acessibilidade — 19/10/2026

O run `39229432254`, no candidato `7bcbbd5ffc00c8395517c605fcd7015e489a2feb`, aprovou quality, secrets e SBOM. A etapa accessibility atingiu o timeout global de 15 minutos durante a compilação isolada dos documentos legais e endpoints sociais.

Antes da interrupção, passaram os quatro testes de admissão editorial, os 17 cenários editoriais/SEO, os 168 cenários de navegação pública e privada sintética e os 11 cenários de horóscopo/ATV+. A suíte principal durou 10,5 minutos. O log completo está na evidência ignorada `test-results/architecture-ci-full-20261019.txt`.

O limite global desse job passa a 25 minutos para permitir a conclusão de todas as etapas e o envio dos artefatos. As listas de testes, assertions, timeout por teste, configuração de autenticação, gates e requisito de CI completo permanecem iguais. O run interrompido não constitui aprovação da etapa restante nem autorização para publicar. Um novo run completo deve aprovar o SHA que contém esse ajuste.
