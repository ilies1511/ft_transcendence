//presence.ts
import type { FriendStatusMsg } from '../types/ws';
import { wsEvents } from '../services/websocket';

export class Presence extends EventTarget {
	private handleStatus = (ev: Event) => {
		const m = (ev as CustomEvent<FriendStatusMsg>).detail;
		if (m.type === 'friend_status_update') {
			this.dispatchEvent(
				new CustomEvent<FriendStatusMsg>('friend-status', { detail: m })
			);
		}
	};

	start(): void {
		wsEvents.addEventListener('friend_status_update', this.handleStatus);
	}

	stop(): void {
		wsEvents.removeEventListener('friend_status_update', this.handleStatus);
	}
}

export const presence = new Presence();
