//frontend/src/services/auth.ts
import { router } from '../main'

export async function submitLogin (email: string, password: string) {
	const res = await fetch('/api/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
		credentials: 'include' // receive the JWT cookie
	})
	if (!res.ok) {
		const { error } = await res.json().catch(() => ({}))
		throw new Error(error ?? 'login failed')
	}

	document.dispatchEvent(new Event('auth-change'))
}

/* strongly-typed shape coming from GET /api/me */
export interface AuthUser {
	id: number
	username: string
	nickname: string
	avatar: string
	live: number
}

export async function currentUser (): Promise<AuthUser | null> {
	const res = await fetch('/api/me', { credentials: 'include' })
	if (!res.ok) return null
	return res.json() as Promise<AuthUser>
}

export async function logout () {
	await fetch('/api/logout', { method: 'POST', credentials: 'include' })
	document.dispatchEvent(new Event('auth-change'))
	router.go('/login')
}
