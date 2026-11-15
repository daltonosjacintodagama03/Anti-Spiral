# Validação das Tasks 1–4 — 2026-11-15

Relatório histórico da primeira entrega. A BD e a autenticação foram posteriormente
configuradas e verificadas no fluxo de requisitos; ver
[mission-requirements-report.md](mission-requirements-report.md).

Commit e push desta implementação, integrada no fluxo actual, autorizados em
2026-11-15; referência em [../feature-status.md](../feature-status.md).

## Caso real de comparação

Coordenada ilustrativa lunar: latitude -85°, longitude 0° (este positivo).
Horizonte geométrico 0°, centro > 0°, altitude assumida na esfera de referência.
A: início 2026-11-14T12:00:00Z. B: início 2026-11-15T12:00:00Z.
Ambos: 72 h, passo 60 min, 73 amostras por corpo, dados do JPL Horizons.

Resultados observados no navegador, via Vite → FastAPI → Horizons:

| Métrica | A | B | B − A |
|---|---:|---:|---:|
| Duração de luz | 47.5002739334 h | 71.5002739334 h | +24 h |
| Terra visível | 72 h | 72 h | 0 h |
| Sol e Terra simultâneos | 47.5002739334 h | 71.5002739334 h | +24 h |

Ambos detectaram sunrise estimado em 2026-11-15T12:29:59.013840Z, bracket de
12:00 a 13:00 UTC. Não há sunset, earthrise ou earthset nestes intervalos.
Os dígitos do instante interpolado são numéricos, não uma alegação de precisão
física sub-segundo. O resultado caracteriza este modelo e estes parâmetros.

Artefacto: backend/tests/fixtures/comparison-live.json contém snapshots, amostras,
métricas e parâmetros/checksums das respostas usadas. Não é usado pela UI normal.
A fixture é reproduzida na suite sem rede; não é uma validação independente do Horizons.

## Testes

- Casos analíticos de sinal constante, limiar zero e cruzamentos conhecidos.
- Uma ou várias transições, incluindo todos os quatro tipos de eventos.
- Conservação temporal a 1e-7 s e intersecção limitada pelas durações individuais.
- Último segmento irregular e dados desconhecidos/non-finitos.
- Toque exacto no horizonte separa janelas contínuas sem criar duração artificial.
- Fixtures reais e falhas HTTP 200 com erro, HTTP 502, timeout e JSON inválido.
- Grelhas normalizadas, limites, longitude, timezone e alinhamento de corpos.
- Navegador: slider por teclado, play/pause sem chamadas adicionais, duplicação
  +24 h, parâmetros preservados, eixo UTC/decorrido e delta de luz conferido.
- Respostas interceptadas apenas no teste: deltas zero, parâmetros incompatíveis
  com ordenação bloqueada e falha de B sem comparação residual.

Comandos e limitações em docs/four-tasks.md. Os resultados finais dos checks
são registados em docs/feature-status.md.

## Limitações de validação

Não foi executada comparação independente com SPICE, terreno real, potência
eléctrica ou disponibilidade de estação terrestre. Eventos entre amostras podem
não ser detectados. A ligação ao PostgreSQL local continua a falhar por autenticação;
nenhuma password existente foi alterada. Estas análises não dependem da BD.
A suite de API usa SQLite isolado para os endpoints existentes; isso não equivale
à validação das migrações numa instância PostgreSQL local.
