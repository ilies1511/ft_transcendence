// frontend/src/websocket.ts  (updated: uses native EventTarget for modern browsers; no shim or custom class needed)

//TODO: should be moved?
type WsMessage =
	{ type: 'direct_message'; to: number; content: string };
	//TODO: add more messages for other ws things


let ws: WebSocket | null = null;
const wsEvents = new EventTarget();

export function initWs() {
	// if already connected, do nothing
	if (ws?.readyState === WebSocket.OPEN)
		return;

	const url = location.protocol === 'https:'
		? `wss://${location.host}/ws`
		: `ws://${location.hostname}:3000/ws`;

	ws = new WebSocket(url);

	ws.onopen = () => {
		console.log('[WS].onopen');
		// TODO: check for auth here..? 
	};

	ws.onclose = () => {
		console.log('[WS].onopen');
		ws = null;
		// TODO: Add reconnect logic here if needed.
		// (e.g., setTimeout(initWs, 10000) if shouldReconnect)
	};

	// ws.onerror = (err) => console.error('WS error:', err);
	ws.onerror  = (ev: Event) => console.error('WS error:', ev);

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
