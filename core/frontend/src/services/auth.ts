// client/src/services/auth.ts

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
  }

  export async function currentUser () {
	const res = await fetch('/api/me', { credentials: 'include' })
	if (!res.ok) return null
	return res.json() as Promise<{ id: number; name: string }>
  }

  export async function logout () {
	await fetch('/api/logout', { method: 'POST', credentials: 'include' })
	document.dispatchEvent(new Event('auth-change'))
	router.go('/login')
  }
