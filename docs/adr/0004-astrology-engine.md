# ADR 0004 — Motor astrológico permissivo

- Estado: provisório; implementação condicionada ao gauntlet de precisão
- Data: 2026-09-02

## Decisão

O domínio expõe `EphemerisProvider` e `HouseCalculator` independentes. A implementação candidata deve ser gratuita e permissiva, suportar runtime edge e registrar versão, algoritmo, timezone, coordenadas e avisos em cada resultado.

Swiss Ephemeris não será incorporado nem comprado nesta fase. Não existe fallback silencioso de Placidus. Em latitudes/condições onde o sistema não produz solução válida, o resultado é um erro de domínio explícito.

## Gate

Antes de ativar resultados públicos, a candidata precisa provar Sol, Lua, planetas, Ascendente, MC, cúspides e aspectos contra fixtures independentes, com tolerâncias documentadas. Enquanto o gate não passa, as rotas mostram estado honesto de preparação.

