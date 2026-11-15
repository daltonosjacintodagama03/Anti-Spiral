# Anti-Spiral

Frontend React/Vite do Lunar Landing Site Navigator.

```sh
cd frontend
npm ci
npm run dev
```

Abrir a aplicação, entrar no perfil pretendido e seleccionar **Visão geral**.
Os cartões superiores mostram Região, Iluminação média diária e Comunicação com a Terra
(média diária da área com visibilidade geométrica terrestre, em percentagem).
O menu apresenta apenas Visão geral, Requisitos da missão, Análise de locais, Resultados e Relatórios. A Visão geral usa dados NASA reais
pré-calculados para 2026, com selecção de dia, visualização às 12:00 UTC, Polo Sul e camadas
geométricas de iluminação/visibilidade terrestre. Os outros módulos conservam o
protótipo anterior, com os seus dados de exemplo explicitamente identificados.

```sh
cd frontend
npm run typecheck
npm run test:science
npm run build
```

A tabela NASA e a textura são servidas localmente; não há API externa por mudança
de dia. Os resultados representam uma esfera sem relevo, não sombras de crateras,
duração diária de iluminação, potência eléctrica ou disponibilidade de rádio.
A cobertura desta entrega limita-se às 8 760 amostras horárias de 2026.

Fontes, aquisição e consultas reais ao Horizons em
[docs/sources/verification.md](docs/sources/verification.md).
Estado e passos de validação em [docs/feature-status.md](docs/feature-status.md).
