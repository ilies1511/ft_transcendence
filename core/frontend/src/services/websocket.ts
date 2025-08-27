// frontend/src/websocket.ts
import type { LobbyInvite } from '../../src/game/game_shared/message_types.ts';

const baseDelay = 500;
let nextDelay = baseDelay;
let timerID: number | null = null;

//TODO: should be moved?
type WsMessage =
	| { type: 'direct_message'; to: number; content: string }
	| { type: 'lobby_invite'; to: number; content: LobbyInvite }
	| { type: 'new_friend_request'; requestId:number; from:string }
	| { type: 'friend_accepted'; friendId:number }
	| { type: 'friend_rejected'; friendId:number }
	| { type: 'friend_removed'; friendId:number }
	| { type: 'user_registered'; user:any }
	| { type: 'user_deleted'; userId:number }
	| { type: 'friends-changed'; userId:number }
	| { type: 'block-changed'; userId:number }
	| { type: 'user_updated'; userId:number }
	| { type: 'friend_request_withdrawn'; userId:number }
	// | { type: 'auth-change'; userId:number }
	
	//TODO: add more messages for other ws things


let ws: WebSocket | null = null;
const wsEvents = new EventTarget();

export function initWs() {
	// if already connected, do nothing
	if (ws?.readyState === WebSocket.OPEN ||
		ws?.readyState === WebSocket.CONNECTING)
		return;

	const url = location.protocol === 'https:'
		? `wss://${location.host}/ws`
		: `ws://${location.hostname}:3000/ws`;

	ws = new WebSocket(url);

	ws.onopen = () => {
		console.log('[WS].onopen');
		nextDelay = baseDelay;
		if (timerID !== null) {
			clearTimeout(timerID); //clean up old timer
			timerID = null;
		}
		// TODO: check for auth here..?
	};

	ws.onclose = () => {
		console.log('[WS].onclose');
		ws = null;
		wsReconnection();
	};

	// ws.onerror = (err) => console.error('WS error:', err);
	ws.onerror = (ev: Event) => console.error('WS error:', ev);

	ws.onmessage = (ev: MessageEvent<string>) => {
		try {
			const data = JSON.parse(ev.data);
			if (!data.type)
				return;

			// Dispatch as CustomEvent named after data.type (e.g., 'direct_message', 'friend_status_update', 'error')
			wsEvents.dispatchEvent(new CustomEvent(data.type, { detail: data }));
		} catch (err) {
			console.error('Bad WS message:', err);
		}
	};
}

function wsReconnection(): void {
	if (!globalThis.logged_in) {
		return ;
	}
	if (nextDelay > 60_000) {
		console.warn('[WS] lost for ever..');
		return;
	}

	console.log(`[WS] reconnect in ${nextDelay} ms`);
	timerID = window.setTimeout(() => {
		timerID = null;
		initWs();
	}, nextDelay)

	nextDelay *= 2;
}

export function closeWs() {
	if (ws) ws.close();
	ws = null;
}

// send data to the server
export function sendWs(msg: WsMessage) {
	if (ws?.readyState !== WebSocket.OPEN) {
		console.warn('WS not open; message dropped');
		return;
	}
	ws.send(JSON.stringify(msg));
}

export { wsEvents };
// Listen here for incoming messages, e.g.
// wsEvents.addEventListener('direct_message', handler)
