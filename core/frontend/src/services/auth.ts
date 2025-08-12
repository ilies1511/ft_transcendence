import { router } from '../main';
import { getSession, clearSession } from '../services/session';
import { closeWs } from './websocket';

const DEFAULT_REDIRECT = '/';

export async function submitLogin(email: string, password: string) {
	const res = await fetch('/api/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
		credentials: 'include'  // Receive the JWT cookie
	});

	if (!res.ok) {
		const { error } = await res.json().catch(() => ({}));
		throw new Error(error ?? 'login failed');
	}

	// Force a fresh session fetch after login
	clearSession();
	const user = await getSession();

	// Redirect based on session
	if (user) {
		router.go(`/`);
	} else {
		router.go(`/login`);  // Fallback
	}

	document.dispatchEvent(new Event('auth-change'));
}

/* TODO: Need to move this so where else. */
export interface AuthUser {
	id: number;
	username: string;
	nickname: string;
	avatar: string;
	live: number;
}

export async function currentUser(): Promise<AuthUser | null> {
	const res = await fetch('/api/me', { credentials: 'include' });
	if (!res.ok) return null;
	try {
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
	router.go('/login');
}
