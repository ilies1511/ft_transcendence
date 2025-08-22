import { currentUser } from './auth';
import type { AuthUser } from '../types/types';

let cache: AuthUser | null | undefined;

export async function getSession() {
	if (cache !== undefined)
	return cache;

	try {
		cache = await currentUser();
	} catch {
		cache = null;
	}

	return cache;
}

// reset after logout
export function clearSession() {
	cache = undefined;
}
