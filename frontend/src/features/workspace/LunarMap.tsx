import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Tooltip } from 'react-leaflet';
import type { LandingSite } from '@/types/site';

interface Props { sites: LandingSite[]; selectedId: string | null; onSelect: (id: string) => void }

/** Mapa em CRS.Simple (km a partir do polo). Sem camada de tiles até existir uma fonte real configurada. */
export function LunarMap({ sites, selectedId, onSelect }: Props) {
  return (
    <MapContainer crs={L.CRS.Simple} center={[0, 0]} zoom={2} minZoom={0} maxZoom={4} className="map" attributionControl={false}>
      <CircleMarker center={[0, 0]} radius={4} pathOptions={{ color: '#8fa6bb', fillOpacity: 1 }}>
        <Tooltip>Polo Sul</Tooltip>
      </CircleMarker>
      {sites.map((s) => (
        <CircleMarker key={s.id} center={[s.yKm, s.xKm]} radius={s.id === selectedId ? 10 : 7}
          pathOptions={{ color: '#1ec8ff', fillColor: s.id === selectedId ? '#1ec8ff' : '#04202e', fillOpacity: 1, weight: 2 }}
          eventHandlers={{ click: () => onSelect(s.id) }}>
          <Tooltip>{s.name}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
