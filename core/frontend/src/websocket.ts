// // frontend/src/websocket.ts
// import { friendRequestToast } from './ui/toast';
// import { currentUser } from './services/auth'

// let friendsWs: WebSocket | null = null;

// export function initFriendsWs() {
// 	if (friendsWs?.readyState === WebSocket.OPEN)
// 		return; // already up

// 	friendsWs?.close();	// close just in case
// 	const url = location.protocol === 'https:'
// 			? `wss://${location.host}/friends`
// 			: `ws://${location.hostname}:3000/friends`
// 	friendsWs = new WebSocket(url)

// 	friendsWs.onmessage = evt => {
// 		try {
// 			const msg = JSON.parse(evt.data);
// 			if (msg.type === 'new_friend_request') {
// 				friendRequestToast(msg.requestId, msg.from);
// 			}
// 		} catch {/* ignore */ }
// 	};
// 	//auto-reconnect if the socket dies while still logged in
// 	friendsWs.onclose = () => {
// 		setTimeout(async () => {
// 			const me = await currentUser()
// 			if (me) initFriendsWs()
// 		}, 2000)
// 	}
// }

// export function closeFriendsWs() {
// 	if (friendsWs && friendsWs.readyState !== WebSocket.CLOSED) {
// 		friendsWs.close(1000, 'logout');
// 	}
// 	friendsWs = null;
// }

// // also close when the tab closes
// window.addEventListener('beforeunload', closeFriendsWs);
