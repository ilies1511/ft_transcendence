import { currentUser } from './auth';

/* in-memory cache that lives only for the life of the tab */
let cache: Awaited<ReturnType<typeof currentUser>> | undefined;

export async function getSession() {
  if (cache !== undefined) return cache;   // reuse if already known
  try {
    cache = await currentUser();           // GET /api/me  (may 401)
  } catch {
    cache = null;                          // treat network/401 as “guest”
  }
  console.log(cache);
  return cache;
}

export function clearSession() {
  cache = undefined;                       // reset after logout
}
