import L from 'leaflet';
import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { MissionSite } from '@/services/position-contract';
import 'leaflet/dist/leaflet.css';
import { projectSouth, unprojectSouth, SOUTH_GRID } from '@/domain/lunarProjection';
// The WMTS advertises EPSG:0 incorrectly. CRS is established from the official
// catalogue's IAU2000:30120 / Moon2000_sp WKT, not its WGS84 bounding-box tag.
const lunarCRS = L.Util.extend({}, L.CRS.Simple, {
  code:'IAU2000:30120',
  projection:{
    project:(point:L.LatLng)=>{const [x,y]=projectSouth(point.lat,point.lng);return L.point(x,y);},
    unproject:(point:L.Point)=>{const [lat,lon]=unprojectSouth(point.x,point.y);return L.latLng(lat,lon);},
    bounds:L.bounds([-SOUTH_GRID.origin,-SOUTH_GRID.origin],[SOUTH_GRID.origin,SOUTH_GRID.origin]),
  },
  transformation:new L.Transformation(1/SOUTH_GRID.resolution0,128,-1/SOUTH_GRID.resolution0,128),
  scale:(zoom:number)=>2**zoom,
  zoom:(scale:number)=>Math.log2(scale),
  infinite:false,
}) as L.CRS;
function Focus({site}:{site:MissionSite}) {
  const map=useMap();
  useEffect(()=>{map.setView([site.latitude_deg,site.longitude_deg],5,{animate:false});map.invalidateSize();},[map,site.id,site.latitude_deg,site.longitude_deg]);
  return null;
}
export default function RegionMap({sites,selected,onSelect,conditions={},utc,layer='sun'}:{sites:MissionSite[];selected:string;onSelect:(id:string)=>void;conditions?:Record<string,boolean|undefined>;utc?:string;layer?:string}) {
  const [tileError,setTileError]=useState(false);
  const site=sites.find(value=>value.id===selected)??sites[0];
  if(!site)return null;
  return <figure className="mission-map"><figcaption>Cartografia orbital LRO WAC — {site.name}. Imagem de base histórica, não fotografia da data escolhida. {utc&&<>Marcadores: {layer==='sun'?'Sol':'Terra'} em {utc} (centro acima do horizonte geométrico: verde; abaixo: cinzento; desconhecido: azul).</>}</figcaption>
    <MapContainer crs={lunarCRS} center={[site.latitude_deg,site.longitude_deg]} zoom={5} minZoom={0} maxZoom={7} className="map" style={{height:360}}>
      <TileLayer url="https://trek.nasa.gov/tiles/Moon/SP/LRO_WAC_Mosaic_SPole60_100m_v02/1.0.0/default/default028mm/{z}/{y}/{x}.png" attribution='NASA / GSFC / ASU · Moon Trek · LRO WAC' noWrap maxNativeZoom={SOUTH_GRID.maxNativeZoom} eventHandlers={{tileerror:()=>setTileError(true)}}/>
      <Focus site={site}/>{sites.map(value=><CircleMarker key={value.id} center={[value.latitude_deg,value.longitude_deg]} radius={value.id===selected?9:5} pathOptions={{color:value.id===selected?'#fbbf24':'#60a5fa',fillColor:conditions[value.id]===undefined?'#60a5fa':conditions[value.id]?'#4ade80':'#64748b',fillOpacity:1,weight:value.id===selected?3:1}} eventHandlers={{click:()=>onSelect(value.id)}}><Tooltip>{value.name}: {value.latitude_deg}°, {value.longitude_deg}° · {conditions[value.id]===undefined?'Sem dados neste instante':conditions[value.id]?'Centro acima do horizonte':'Centro abaixo ou no horizonte'}</Tooltip></CircleMarker>)}
    </MapContainer>
    {tileError&&<p role="status">Alguns tiles NASA estão indisponíveis. Consulte os valores e as coordenadas; não são substituídos por terreno fictício.</p>}
    <p>Projecção estereográfica polar lunar IAU2000:30120 (raio 1737,4 km). Longitude 0° para cima, 90° E para a direita. Os tiles mais finos têm cerca de 268 m/pixel; ampliar não acrescenta detalhe. Sem DEM: inclinação, altitude e sombras locais não calculadas. Se os tiles não carregarem, coordenadas e resultados permanecem disponíveis.</p>
  </figure>;
}
