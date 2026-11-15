export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials:'same-origin', ...options,
    headers:{'Content-Type':'application/json', ...options.headers} });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail==='string'?data.detail:Array.isArray(data.detail)?data.detail.map((item:{msg:string})=>item.msg).join('; '):'Não foi possível concluir o pedido.');
  return data;
}
