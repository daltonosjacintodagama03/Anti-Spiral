# Fontes verificadas — actualização frontend, 14-11-2026

## Recursos do challenge

Página indicada: https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=resources

A ferramenta web não abriu a página. Foi possível descarregar o HTML e ler o conteúdo
serializado de Next.js. Os links efectivamente encontrados na secção de recursos foram:

- QuickMap: https://quickmap.lroc.asu.edu/
- Moon Trek: https://trek.nasa.gov/moon/
- Horizons System: https://ssd.jpl.nasa.gov/horizons/
- CSA Moon Exploration: https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/

Não foram encontrados links `.ipynb`/Colab nessa secção. Nenhum notebook foi executado.
A reprodução https://hackathlone.com/challenges/lunar-landing-site-navigator foi consultada
como apoio antes de obter a página oficial; não substitui a fonte oficial.

## Dados utilizados na Visão geral

- Página NASA SVS: https://svs.gsfc.nasa.gov/5587/
- Tabela: https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json
- Campos seleccionados, sem arredondamento adicional: longitude/latitude dos pontos
  subsolar e subterrestre e distância Terra–Lua em km. Timestamps horários consecutivos
  são verificados pelo script de preparação antes de produzir o artefacto local.
- Origem e SHA-256 registados em `moon-2026-manifest.json`.
- Textura: https://svs.gsfc.nasa.gov/4720/ e
  https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg
  (NASA / GSFC / Arizona State University).

A tabela SVS é um recurso NASA adicional escolhido para o frontend; não é apresentada
como um dos quatro links do challenge. A textura não é um DEM. Não foram integrados
serviços de QuickMap/Moon Trek nem dados de topografia neste trabalho.

O ambiente apresentou falhas de validação da cadeia TLS. Os downloads de leitura foram
feitos com verificação TLS desactivada apenas no comando de obtenção. Isso é uma
limitação da aquisição neste ambiente; o script versionado não desactiva TLS. A aplicação
serve cópias locais e não depende de contornar TLS/CORS em tempo de execução.

## Consulta real ao recurso Horizons

Documentação: https://ssd-api.jpl.nasa.gov/doc/horizons.html e
https://ssd.jpl.nasa.gov/horizons/manual.html

Foram feitos pedidos reais `OBSERVER`, observador `coord@301`, coordenadas geodéticas
`0,-89.5,0` (longitude este, latitude norte, altitude em km), `QUANTITIES=4`,
`APPARENT=AIRLESS`, Sol `10` e Terra `399`, em 14-11-2026 às 12:00 UTC.
Pedidos e respostas completos estão nos quatro ficheiros `horizons-*.json` nesta pasta.

A primeira tentativa usou por engano `REFRACT` e recebeu HTTP 400. Os artefactos preservados
correspondem às consultas bem-sucedidas com `APPARENT`, não à tentativa falhada.

Resultados reais às 12:00:

| Corpo | Azimute (°) | Elevação (°) |
|---|---:|---:|
| Sol | 120.534441 | 1.302620 |
| Terra | 358.078065 | -3.621837 |

O teste compara as elevações com os vectores derivados da tabela SVS. Tolerância de
aceitação pré-definida: 0,03°, considerando coordenadas SVS arredondadas a 0,001°,
raios solares paralelos e convenções/modelos distintos. É uma verificação limitada de
consistência num local/instante; não certifica a exactidão global ou de terreno.

Elevações derivadas da tabela SVS no mesmo ponto/instante: Sol 1,303009° e Terra
-3,621376°. Diferenças absolutas face ao Horizons: 0,000389° e 0,000461°,
respectivamente, inferiores à tolerância predefinida.
