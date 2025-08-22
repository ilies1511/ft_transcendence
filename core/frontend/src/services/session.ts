import { currentUser } from './auth';
import type { AuthUser } from '../types/types';

let cache: Promise<AuthUser | null> | undefined;

export async function getSession():Promise <AuthUser | null> {
	if (cache)
		return cache;

	cache = (async () => {
		try{
			const user = await currentUser();
			return user ?? null;
		} catch{
			return null;
		}
	})();

	return cache;
}

export function clearSession() {
	cache = undefined;
}
