// src/utils/isFriend.ts
import type { ApiUserWithFriends } from '../types/types'
import { getSession } from '../services/session';

export async function isFriend(profileId: number): Promise<boolean> {
	const me = await getSession()
	if (!me)
		return false // not logged-in
	if (me.id === profileId)
		return true // my own profile

	const res = await fetch(`/api/users/${me.id}/friends`)
	if (!res.ok)
		return false

	const data = await res.json() as ApiUserWithFriends
	return data.friends.some(f => f.id === profileId)
}