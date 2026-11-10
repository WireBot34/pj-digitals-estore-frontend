import { useCallback, useEffect, useState } from "react";
import { api, qs } from "./api";

/** Loads a paginated list from the API and exposes reload(). */
export function useList(path, params, token, tell) {
  const [state, setState] = useState({ data: [], pagination: null, loading: true });
  const key = JSON.stringify(params);
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await api(path + qs(params), { token: await token() });
      setState({ data: r.data || [], pagination: r.pagination, loading: false });
    } catch (e) {
      tell(e.message, "error");
      setState((s) => ({ ...s, loading: false }));
    }
  }, [path, key, token, tell]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
