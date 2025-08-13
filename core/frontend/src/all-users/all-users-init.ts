import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';
import { template, wireEvents, unWireEvents } from './all-users-ui';
import { fetchAndFill } from './all-users-list';
import { gameInviteToast } from '../ui/gameInviteToast';
import type { LobbyInvite, ServerError } from '../game/game_shared/message_types.ts';

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

	wsEvents.removeEventListener('lobby_invite', handleLobbyInvite);
}
