# Entrega das quatro tasks

**Actualização:** Sol/Terra está agora no menu próprio `sol-terra` e o login é real.
O novo fluxo de requisitos guarda análises na BD por conta; ver
[mission-requirements.md](mission-requirements.md). O explorador isolado A/B
descrito abaixo continua temporário.

Entrega incluída nas alterações cujo commit e push para `dalton/frontend` foram
autorizados em 2026-11-15; ver [feature-status.md](feature-status.md).

## O que funciona

1. **Posições reais**: POST /api/positions consulta Sol e Terra no JPL Horizons;
   normaliza o pedido, verifica cabeçalhos e alinhamento e devolve proveniência.
2. **Eventos e janelas**: uma única função Python integra segmentos lineares,
   encontra sunrise/sunset/earthrise/earthset, gera janelas de Sol, Terra e ambas,
   calcula durações, maior interrupção e maior janela contínua. Desconhecido é separado.
3. **Análise interactiva**: formulário de coordenadas/data/duração/passo, horizonte
   local SVG, séries de elevação, tabela, timeline por teclado e play/pause. Todos
   usam o mesmo run_id e cursor; mover o cursor não consulta a API.
4. **Comparação**: duplicar A e adiar +24 h, ou copiar sem adiar para alterar local;
   confirmar os parâmetros e executar B. Gráficos em tempo decorrido ou UTC,
   deltas B−A, pontos percentuais e ordenação crescente por uma métrica explícita.
   Configurações incompatíveis ou cobertura incompleta bloqueiam deltas/ordenação.

Cada resposta tem identidade de execução, snapshot de parâmetros e versão do motor.
Resultados e comparações vivem na sessão React: recarregar a página remove-os.
Não há persistência de análises, colaboração ou autorização de recursos privados
nestas quatro tasks. A autenticação foi substituída por sessões reais na entrega de requisitos.
Não é necessário criar uma API adicional de comparação, pois o componente compara
respostas já calculadas; não repete integração científica no frontend.

## Executar

Com as dependências instaladas e backend/.env configurado:

```sh
cd backend
python3 -m uvicorn app.main:app --reload
```

Noutro terminal:

```sh
cd frontend
npm ci
npm run dev
```

O Vite encaminha /api para 127.0.0.1:8000. Pode configurar ANTISPIRAL_API_TARGET
para outra porta local. Em produção é necessário encaminhar /api no reverse proxy.
A análise destas tasks não usa PostgreSQL; health/sites/jobs existentes usam.

## Validação humana (3–5 minutos)

1. Abrir um perfil e a **Análise de Sol e Terra**, no menu próprio.
2. Em A, usar latitude **-85**, longitude **0**, início **2026-11-14 12:00 UTC**,
   duração **72 h** e passo **60 min**. São coordenadas ilustrativas, não um local
   recomendado ou posição de missão histórica.
3. Analisar: esperar 73 instantes. Consultar duração de luz, Terra visível e janelas.
4. Percorrer o slider com setas; usar play/pause. Conferir o timestamp, posições,
   linha do cursor e amostra destacada. Abrir eventos e inspeccionar o bracket.
5. Duplicar e adiar +24 h; confirmar início em 2026-11-15 12:00 UTC e analisar B.
6. Comparar métricas/deltas e alternar o eixo UTC/tempo desde a aterragem.
7. Alterar o passo de B para 30 min e recalcular (145 amostras): a comparação
   deve explicar a incompatibilidade e bloquear deltas e ordenação. Para normalizar,
   voltar a 60 min e executar de novo; nenhuma conversão é feita silenciosamente.
8. Copiar A para alterar local, mudar apenas longitude, executar e comparar.
9. Alterar inputs sem executar: o resultado permanece identificado como anterior.

O próximo evento é pesquisado apenas desde o cursor até ao fim calculado. A ausência
não significa que o evento nunca aconteça. Só são mostradas posições amostradas;
não há interpolação visual adicional a modificar as métricas.

## Modelo e limites

- Horizonte geométrico local 0°, centro visível se elevação > 0; igualdade é não visível.
- Datas inteiramente em 2026, duração de 1–168 h, passo de 1–60 min, 200 amostras
  por corpo no máximo. O último segmento pode ser mais curto.
- Altitude assumida de 0 km na esfera de referência lunar; sem terreno ou refracção.
- Visibilidade da Terra não garante rádio, nem luz garante potência eléctrica.
- Um segmento com qualquer extremo desconhecido não é integrado como invisível.
  A conjunção é conhecida falsa se um dos corpos está comprovadamente invisível.
- Tolerância de conservação interna: 1e-7 s nos testes, escolhida para erros numéricos
  de integração. Timestamps exportados pela API têm arredondamento a microssegundos;
  isso não indica exactidão física dos eventos. A saída angular do fornecedor tem
  seis casas decimais nas fixtures, e os eventos conservam o bracket original.
- Um toque exacto em 0° separa janelas contínuas sem acrescentar duração artificial.
- Uma consulta activa por processo, orçamento de 50 s; falhas são explícitas, sem mocks.
- O máximo solar é o máximo **amostrado**, não uma optimização entre instantes.

## Checks reproduzíveis

```sh
cd backend
pytest
python ../scripts/generate_position_types.py
```

```sh
cd frontend
npm run typecheck
npm run test:science
npm run build
```

O contrato TypeScript e o snapshot OpenAPI são gerados a partir dos schemas FastAPI.
A suite backend normal não usa rede. Há casos sintéticos para todos os tipos de
transição, igualdade, lacunas e fim irregular; não são resultados reais do produto.

Teste de navegador opt-in, com API/Vite iniciados e Chrome instalado:

```sh
npm install --prefix /tmp/antispiral-browser playwright-core
ANTISPIRAL_PLAYWRIGHT_MODULE=/tmp/antispiral-browser/node_modules/playwright-core/index.mjs \
  node scripts/check_four_tasks_browser.mjs
```

Pode configurar ANTISPIRAL_WEB_URL e ANTISPIRAL_CHROME. A primeira parte consulta
Horizons real. A segunda intercepta respostas explicitamente no teste para verificar
igualdade, incompatibilidade e erro. Nenhuma fixture alimenta a aplicação normal.
