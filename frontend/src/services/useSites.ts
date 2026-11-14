import { useCallback, useEffect, useState } from 'react';
import { getSites } from './sites';
import type { LandingSite } from '@/types/site';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sites: LandingSite[] };

export function useSites() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const load = useCallback(() => {
    setState({ status: 'loading' });
    getSites()
      .then((sites) => setState({ status: 'ready', sites }))
      .catch(() => setState({ status: 'error', message: 'Não foi possível carregar os locais de pouso.' }));
  }, []);
  useEffect(load, [load]);
  return { state, reload: load };
}
