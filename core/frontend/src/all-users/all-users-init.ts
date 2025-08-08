import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';
import { template, wireEvents, unWireEvents } from './all-users-ui';
import { fetchAndFill } from './all-users-list';
import { inviteToast } from '../ui/inviteToast';

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

function handleLobbyInvite(ev: Event) {
	const { from, content } = (ev as CustomEvent).detail;

	inviteToast(`User #${from} invited you to play`);

	console.log('[LobbyInvite] from user', from, content);
}

export function destroyAllUsersUI() {
	const root = document.getElementById('all-users-ui-root');
	if (!root) return;

	unWireEvents(root);
	root.innerHTML = '';

	wsEvents.removeEventListener('lobby_invite', handleLobbyInvite);
}
