import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';
import { template, wireEvents, unWireEvents } from './all-users-ui';
import { fetchAndFill } from './all-users-list';
import { inviteToast } from '../ui/inviteToast';
import type { LobbyInvite, ServerError } from '../game/game_shared/message_types.ts';
import { LobbyType } from '../game/game_shared/message_types.ts';
import {
	accept_lobby_invite,
	create_join_lobby,
	invite_user_to_lobby_skeleton,
	recv_lobby_invite_skeleton,
} from '../game/frontend_interface_examples/custom_lobbies.ts';
import { Game } from '../game/game_new.ts'
import { Tournament } from '../game/Tournament.ts'


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

	await inviteToast(`User #${from} invited you to play`);

	console.log('[LobbyInvite] from user', from, content);
}

export function destroyAllUsersUI() {
	const root = document.getElementById('all-users-ui-root');
	if (!root) return;

	unWireEvents(root);
	root.innerHTML = '';

	wsEvents.removeEventListener('lobby_invite', handleLobbyInvite);
}
