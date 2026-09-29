# WU204 — Mapa de Propósito & Carreira: MC e casas 2/6/10

- Requisito do plano: §7.3, MC e casas 2, 6, 10; §0.2 E1. Implementação local em `apps/worker/src/purpose-career-calculators.ts`, contrato versionado em `docs/contracts/purpose-career-calculation.md`.
- Entrada sintética consentida, civil/UTC coerente; um mapa validado; somente quatro fatos geométricos calculados e contexto relatado. Caso polar sem cúspides. Projeção persistida adulterada rejeitada antes do editorial.
- `experimentalPurposeCareerBase` não entra no runtime padrão nem na contagem de bases padrão; allowlist de processamento independente. `prepareProductFacts` bloqueia projeções coerentes por `insufficient_facts` e incoerentes por `calculation_invalid`.
- Validação local: Worker TypeScript, testes focais de runtime, Bússola e Mapa (24/24) e suíte Worker completa (348/348) passaram. O fixture genérico de orçamento premium do teste de entrega usa agora `direction-journey`, pois `purpose-career` tem recusa editorial própria. Candidata experimental, sem gauntlet/Swiss Ephemeris aprovada e sem release hospedado. O produto segue E1 parcial, E2–E5 pendentes. Não há preço, entitlement, PDF ou áudio ativados.
