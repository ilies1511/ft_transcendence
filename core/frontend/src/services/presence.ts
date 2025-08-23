// presence.ts
import type { FriendStatusMsg } from '../types/types.ts'
import { wsEvents } from '../services/websocket'
import { updateDot } from '../utils/statusDot'

export class Presence extends EventTarget {
	private active = false;

	private handleStatus = (ev: Event) => {
		const m = (ev as CustomEvent<FriendStatusMsg>).detail
		if (m.type !== 'friend_status_update')
			return;
		updateDot(m.friendId, m.online)
		this.dispatchEvent(
			new CustomEvent<FriendStatusMsg>('friend-status', { detail: m })
		)
	}

	start(): void {
		if (this.active)
			return;
		this.active = true
		console.log('PRESENCE [START]')
		wsEvents.addEventListener('friend_status_update', this.handleStatus)
	}

	stop(): void {
		if (!this.active)
			return;
		this.active = false
		console.log('PRESENCE [END]')
		wsEvents.removeEventListener('friend_status_update', this.handleStatus)
	}
}

export const presence = new Presence()