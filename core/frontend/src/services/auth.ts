import { router } from '../main';
import { getSession, clearSession } from '../services/session';

const DEFAULT_REDIRECT = '/';  // Fallback route if session fetch fails after login

/**
 * Submits login credentials and redirects to the user's profile on success.
 * @param email User's email
 * @param password User's password
 */
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
		router.go(`/profile/${user.id}`);
	} else {
		router.go(DEFAULT_REDIRECT);  // Fallback
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

/**
 * Fetches the current authenticated user from /api/me.
 * @returns AuthUser object or null if not authenticated
 */
export async function currentUser(): Promise<AuthUser | null> {
	const res = await fetch('/api/me', { credentials: 'include' });
	if (!res.ok) return null;
	try {
		return await res.json() as AuthUser;
	} catch {
		return null;  // Handle JSON parse errors gracefully
	}
}

/**
 * Logs out the user, clears the session cache, and redirects to login.
 */
export async function logout() {
	await fetch('/api/logout', { method: 'POST', credentials: 'include' });
	clearSession();  // Reset cache for next session check
	document.dispatchEvent(new Event('auth-change'));
	router.go('/login');
}
