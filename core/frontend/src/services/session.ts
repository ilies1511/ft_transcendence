import { currentUser } from './auth';

// in memory cache so we dont need to call currentUser every time.
let cache: Awaited<ReturnType<typeof currentUser>> | undefined;

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
