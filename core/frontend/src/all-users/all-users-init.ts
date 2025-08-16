import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';
import { template, wireEvents, unWireEvents } from './all-users-ui';
import { fetchAndFill } from './all-users-list';
import { gameInviteToast } from '../ui/gameInviteToast';
import type { LobbyInvite, ServerError } from '../game/game_shared/message_types.ts';

let refreshListener: (() => void)|null = null;

export async function initAllUsersUI() {
	const root = document.getElementById('all-users-ui-root');
	if (!root)
		return;

	const me = await getSession();
	if (!me) { 
		root.innerHTML = '';
		return;
	}

	root.innerHTML = template;
	await fetchAndFill(me.id);
	wireEvents(root);

	const refresh = () => fetchAndFill(me.id);
	refreshListener = refresh;
	wsEvents.addEventListener('user_registered', refresh);
	wsEvents.addEventListener('lobby_invite', handleLobbyInvite);
}

async function handleLobbyInvite(ev: Event) {
	const { from, content } = (ev as CustomEvent).detail;
	globalThis.last_invite = content as LobbyInvite;
	const invite: LobbyInvite = content as LobbyInvite;

	gameInviteToast(from);

	console.log('[LobbyInvite] from user', from, content);
}

export function destroyAllUsersUI() {
	const root = document.getElementById('all-users-ui-root');
	if (!root) return;

	unWireEvents(root);
	root.innerHTML = '';
	if (refreshListener) {
		wsEvents.removeEventListener('user_registered', refreshListener);
		refreshListener = null;
	}
	wsEvents.removeEventListener('lobby_invite', handleLobbyInvite);
}







// import { getSession } from '../services/session';
// import { wsEvents } from '../services/websocket';
// import { template, wireEvents, unWireEvents } from './all-users-ui';
// import { fetchAndFill } from './all-users-list';
// import { gameInviteToast } from '../ui/gameInviteToast';
// import type { LobbyInvite, ServerError } from '../game/game_shared/message_types.ts';



// // store listener *on the root element* → unique per mount
// const REF_KEY = '__allUsersRefresh__' as const;

// export async function initAllUsersUI() {
// 	const root = document.getElementById('all-users-ui-root');
// 	if (!root) return;

// 	const me = await getSession();
// 	if (!me) { root.innerHTML = ''; return; }

// 	// define refresh BEFORE any awaits
// 	const refresh = () => fetchAndFill(me.id);
// 	(root as any)[REF_KEY] = refresh;        // stash on DOM node

// 	root.innerHTML = template;
// 	await fetchAndFill(me.id);
// 	wireEvents(root);

// 	wsEvents.addEventListener('user_registered', refresh);
// 	wsEvents.addEventListener('lobby_invite',    handleLobbyInvite);
// }

// export function destroyAllUsersUI() {
// 	const root = document.getElementById('all-users-ui-root');
// 	if (!root) return;

// 	unWireEvents(root);
// 	root.innerHTML = '';

// 	// retrieve exact same function instance
// 	const refresh = (root as any)[REF_KEY] as (() => void)|undefined;
// 	if (refresh) wsEvents.removeEventListener('user_registered', refresh);

// 	wsEvents.removeEventListener('lobby_invite', handleLobbyInvite);
// 	delete (root as any)[REF_KEY];
// }