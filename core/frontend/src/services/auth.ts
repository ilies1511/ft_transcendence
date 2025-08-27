import { router } from '../main';
import { clearSession } from '../services/session';
import { closeWs } from './websocket';
import type { AuthUser } from '../types/types';

export async function currentUser(): Promise<AuthUser | null> {
	try {
		const res = await fetch('/api/session', { method: 'GET', credentials: 'include' });
		if (res.status === 204) return null;     // not logged in, no console errors
		if (!res.ok) return null;
		return await res.json() as AuthUser;
	} catch {
		return null;  // Handle JSON parse errors gracefully
	}
}

export async function logout() {
	closeWs()
	await fetch('/api/logout', { method: 'POST', credentials: 'include' });
	clearSession();  // Reset cache for next session check
	document.dispatchEvent(new Event('auth-change'));
	globalThis.logged_in = false
	router.go('/login');
}
