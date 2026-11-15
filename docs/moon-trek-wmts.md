# Moon Trek: selecionar coordenadas e obter imagens WMTS

Este guia mostra como testar a camada global **LRO WAC Mosaic v2** do NASA Moon Trek e como usar os metadados WMTS para pedir imagens. O serviço retorna tiles (blocos de imagem), não um endpoint que aceite `latitude` e `longitude` e devolva automaticamente um recorte.

## 1. Camada de teste

Endpoint da camada e projeção equirectangular:

```text
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0
```

Metadados WMTS (GetCapabilities):

```text
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml
```

Os metadados informam cobertura, projeção, matriz de tiles, níveis de zoom, estilo e formato. Não fixe `TileMatrix`, `TileRow`, `TileCol` ou extensão (`.jpg`/`.png`) sem conferir esses dados: o tile `/0/0/0` é apenas um exemplo de nível inicial e tem resolução baixa.

## 2. Testar uma requisição

### Obter os metadados

No terminal:

```bash
curl -L \
  'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml' \
  -o /tmp/moon-wmts.xml
```

Abra `/tmp/moon-wmts.xml` e procure `TileMatrixSet`, `TileMatrix`, `ResourceURL`, `TileWidth`, `TileHeight` e `TopLeftCorner`. `ResourceURL` contém o padrão de URL e a extensão certa.

### Pedir um tile

O formato REST WMTS é:

```text
{endpoint}/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{ext}
```

Exemplo de tile de nível inicial (a disponibilidade depende da camada):

```bash
curl -L \
  'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg' \
  -o /tmp/moon-tile.jpg
```

Abra o JPG para confirmar a resposta. Um erro ou tile vazio pode significar que a combinação de matriz/linha/coluna não tem cobertura. Use os valores publicados no XML da camada, em vez de assumir que este exemplo serve para todos os níveis.

## 3. Coordenada escolhida no mapa

Uma latitude/longitude lunar **não é** `TileRow`/`TileCol`. Para chegar ao tile correto, a aplicação deve:

1. Definir qual projeção a interface usa (aqui, equirectangular `EQ`) e a convenção selenográfica de longitude (leste/oeste) e latitude.
2. Converter o clique do mapa para coordenadas na projeção da camada.
3. Usar a cobertura e a matriz de tiles do GetCapabilities para calcular a matriz (zoom), linha e coluna que cobrem o ponto/retângulo.
4. Pedir os tiles e juntá-los no mapa. Para um recorte raster, recortar os pixels pelo limite projetado desejado e guardar também a transformação geográfica (por exemplo, GeoTIFF) se a localização exata precisar ser preservada.

O serviço WMTS documentado fornece tiles; não é uma API de `GET ?lat=...&lon=...` nem promete uma imagem única arbitrária por coordenadas. Em geral, a opção mais segura é deixar uma biblioteca de mapa compatível com WMTS cuidar da projeção, níveis e mosaico, e ler a coordenada do evento de clique na mesma projeção. Para baixar um recorte georreferenciado, a aplicação precisa juntar e recortar tiles ou obter o produto raster original no arquivo apropriado.

## 4. Escolher a melhor resolução

`303ppd` no nome do mosaico identifica a resolução nominal global do produto, não garante que cada ponto tenha imagem original com essa resolução. WAC é uma camada global de contexto; para detalhe fino, use o QuickMap/NAC Search para encontrar imagens LROC NAC que cobrem a área e descarregue o produto correspondente do arquivo LROC/PDS. A cobertura e a resolução variam por região. Um zoom maior que o último nível WMTS só amplia os pixels, não acrescenta detalhe.

Não use uma captura de ecrã como substituto do raster original quando precisar de resolução/escala científica: captura guarda apenas os pixels apresentados na tela.

## 5. Integração no projeto

O componente atual [LunarMap](../frontend/src/features/workspace/LunarMap.tsx) usa `L.CRS.Simple` e coordenadas `xKm`/`yKm` centradas no polo. Isso não é o mesmo sistema do mosaico equirectangular `EQ`. Adicionar a URL WMTS como se fosse uma camada XYZ nesse mapa pode posicionar a imagem incorretamente.

Para integrar sem deslocar os dados:

- escolha uma projeção de mapa compatível com a matriz/projeção indicada no WMTS; ou implemente uma conversão explícita entre longitude/latitude, EQ e o sistema polar atual;
- capture no evento de clique tanto a coordenada geográfica lunar quanto a coordenada da camada;
- envie ao backend as coordenadas lunares, identificador da camada/produto e, se necessário, a geometria do recorte;
- guarde `x_km`/`y_km` apenas como coordenadas cartesianas, sem as tratar como latitude/longitude;
- não guarde a URL de um tile como se fosse uma imagem estática do ponto. Guarde o identificador da camada e coordenadas/área; os tiles dependem de zoom e cobertura.

Uma seleção de ponto pode ser persistida como `latitude_deg`, `longitude_deg`, `coordinate_system` (por exemplo, referencial lunar e convenção de longitude), `layer_id` e opcionalmente `image_product_id`. Para um recorte retangular, persista os limites/geometria em coordenadas lunares. A imagem pode ser obtida novamente dos tiles/produto; `image_url` só é apropriada quando houver uma URL estável para um produto ou ficheiro efetivamente armazenado.

## Fontes

- [NASA Trek WMTS API: Moon](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon) — formato REST, GetCapabilities, matrizes e tiles.
- [LROC NAC Processing Guide](https://lroc.im-ldi.com/data/support/downloads/LROC_NAC_Processing_Guide.pdf) — usar Draw Point/Polygon no QuickMap para localizar observações NAC e aceder aos produtos no arquivo.
- [LROC Data Archive](https://pds.lroc.im-ldi.com/data) — produtos LROC para download e processamento.
