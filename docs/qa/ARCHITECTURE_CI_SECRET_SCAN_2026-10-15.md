# Verificação de segredos da arquitetura — 15/10/2026

O job `secrets` da execução GitHub Actions `38773045695` apontou um único
resultado `generic-api-key` em `apps/web/scripts/qa-atv-plus.mjs:51`, no commit
`1855e1b99d81d3e194384ecf1d9e9854d6cb1625`.

A inspeção confirmou um UUID sintético de idempotência enviado por uma chamada
anônima do teste que exige rejeição HTTP 401/503. Não é credencial nem dado de
produção. O script agora gera um UUID novo por requisição com `randomUUID()`.

Foi registrada apenas a impressão digital exata desse falso positivo histórico
em `.gitleaksignore`, conforme o mecanismo oficial do Gitleaks. Nenhuma regra,
diretório, extensão ou varredura foi desativada; futuras ocorrências continuam
sujeitas ao gate. A nova execução CI precisa confirmar o resultado.

Referência: https://github.com/gitleaks/gitleaks#fingerprints
