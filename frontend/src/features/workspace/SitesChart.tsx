import Plotly from 'plotly.js-basic-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import type { LandingSite } from '@/types/site';

const Plot = createPlotlyComponent(Plotly);

export default function SitesChart({ sites, selectedId }: { sites: LandingSite[]; selectedId: string | null }) {
  const names = sites.map((s) => s.name);
  const opacity = sites.map((s) => (selectedId === null || s.id === selectedId ? 1 : 0.4));
  return (
    <Plot
      data={[
        { type: 'bar', name: 'Iluminação (%)', x: names, y: sites.map((s) => s.illuminationPct), marker: { color: '#1ec8ff', opacity } },
        { type: 'bar', name: 'Visibilidade da Terra (%)', x: names, y: sites.map((s) => s.earthVisibilityPct), marker: { color: '#6f86ff', opacity } },
      ]}
      layout={{ barmode: 'group', autosize: true, height: 300, margin: { t: 16, r: 8, b: 48, l: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#eaf2fa', family: 'Archivo Narrow, sans-serif' }, legend: { orientation: 'h', y: -0.2 }, yaxis: { range: [0, 100], gridcolor: '#17314a' } }}
      config={{ displayModeBar: false, responsive: true }}
      useResizeHandler
      style={{ width: '100%' }}
    />
  );
}
