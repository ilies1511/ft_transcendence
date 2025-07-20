// presence.ts
import type { FriendStatusMsg } from '../types/ws'

export class Presence extends EventTarget {
	private ws?: WebSocket				// active socket
	private timer: number | null = null
	private readonly reconnect = 10_000	// 10 s before retry
	private shouldReconnect = false		// toggled by start/stop

	/* open socket after login / page-refresh */
	start(): void {
		if (this.ws)
			return	// already connecting/open

		this.shouldReconnect = true

		const url =
			location.protocol === 'https:'
				? `wss://${location.host}/ws`
				: `ws://${location.hostname}:3000/ws`

		this.ws = new WebSocket(url)

		/* handle incoming message */
		this.ws.onmessage = ev => {
			try {
				const m = JSON.parse(ev.data) as FriendStatusMsg
				if (m.type === 'friend_status_update') {
					this.dispatchEvent(
						new CustomEvent<FriendStatusMsg>('friend-status', { detail: m })
					)
				}
			} catch {
				/* ignore if fails */
			}
		}

		/* handle close / schedule reconnect */
		this.ws.onclose = () => {
			this.ws = undefined
			if (this.shouldReconnect) {
				this.timer = window.setTimeout(() => this.start(), this.reconnect)
			}
		}
	}

	/* close socket on logout */
	stop(): void {
		this.shouldReconnect = false
		if (this.timer !== null) {
			clearTimeout(this.timer)
			this.timer = null
		}
		this.ws?.close(1000, 'logout')
		this.ws = undefined
	}
}

/* shared instance */
export const presence = new Presence()
