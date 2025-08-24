import { currentUser } from './auth';
import type { AuthUser } from '../types/types';

let cache: Promise<AuthUser | null> | undefined;
export let token: string | undefined = undefined;

try {
	const res = await fetch(`/api/csrf`, {
		credentials: 'include',
		method: 'GET',
	});
	const data = await res.json();

	if (data && typeof data.token === 'string' && data.token.length > 0) {
		token = data.token;
		console.log(`csrf token: ${token}`); //TODO: REMOVE THIS
	} else {
		token = undefined;
	}
} catch (e) {
	console.log(e);
	token = undefined;
}
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
