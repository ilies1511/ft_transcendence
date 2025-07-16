// frontend/src/websocket.ts
import { friendRequestToast } from './ui/toast';

let friendsWs: WebSocket | null = null;

export function initFriendsWs() {
	if (friendsWs?.readyState === WebSocket.OPEN) return; // already up

	friendsWs?.close();	// close stale
	friendsWs = new WebSocket('ws://localhost:3000/friends');	// same origin

	friendsWs.onmessage = evt => {
		try {
			const msg = JSON.parse(evt.data);
			if (msg.type === 'new_friend_request') {
				friendRequestToast(msg.requestId, msg.from);
			}
		} catch {/* ignore */ }
	};
}

export function closeFriendsWs() {
	if (friendsWs && friendsWs.readyState !== WebSocket.CLOSED) {
		friendsWs.close(1000, 'logout');
	}
	friendsWs = null;
}

// also close when the tab closes
window.addEventListener('beforeunload', closeFriendsWs);
