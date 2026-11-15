/** Moon2000 south-pole stereographic: R=1737400 m, lon0=0, k=1.
 * WKT: NASA Moon Trek catalogue, IAU2000:30120. No Earth datum.
 */
const R=1737400;
const RAD=Math.PI/180;
export function projectSouth(latitude:number,longitude:number):readonly[number,number]{
  const rho=2*R*Math.tan(Math.PI/4+latitude*RAD/2);
  return [rho*Math.sin(longitude*RAD),rho*Math.cos(longitude*RAD)];
}
export function unprojectSouth(x:number,y:number):readonly[number,number]{
  const rho=Math.hypot(x,y);
  return [(2*Math.atan(rho/(2*R))-Math.PI/2)/RAD,rho===0?0:Math.atan2(x,y)/RAD];
}
// Native NASA WMTS grid: top-left (-1095930,1095930), scale0 * 0.28 mm.
export const SOUTH_GRID={origin:1095930,resolution0:8561.953125,maxNativeZoom:5};
