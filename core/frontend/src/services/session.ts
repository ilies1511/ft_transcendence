import { currentUser } from './auth';

// in memory cache so we dont need to call currentUser every time.
let cache: Awaited<ReturnType<typeof currentUser>> | undefined;

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
