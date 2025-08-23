import { currentUser } from './auth';
import type { AuthUser } from '../types/types';

let cache: Promise<AuthUser | null> | undefined;

//const base =
//	(location.protocol === 'http:' + location.host;

//console.log(location.host)
export let token: any = undefined;
try {
	//todo: remove hardcoded localhost
	token = await fetch(`http://localhost:3000/api/csrf`, {
		credentials: 'include',
	}).then(r => r.json())
} catch (e) {
	console.log(e);
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
