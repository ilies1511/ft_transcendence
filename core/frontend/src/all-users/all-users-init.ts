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

//todo: currently the ivite gets automatically accepted
async function handleLobbyInvite(ev: Event) {
	const { from, content } = (ev as CustomEvent).detail;
	const invite: LobbyInvite = content as LobbyInvite;

	inviteToast(`User #${from} invited you to play`);

	console.log('[LobbyInvite] from user', from, content);

	const me           = await getSession();
	const container    = document.querySelector<HTMLElement>('#game-container');

	if (!me || !container) {
		return;
	}
	const user_id      = me.id;
	const display_name = me.nickname ?? `player_${user_id}`;

	switch (invite.lobby_type) {
		case (LobbyType.INVALID):
			return ;
		case (LobbyType.CUSTOM):
		case (LobbyType.MATCHMAKING):
		case (LobbyType.TOURNAMENT_GAME):
			const game: Game | ServerError = await accept_lobby_invite(
				user_id,
				container,
				invite,
				display_name,
			);
			if (game == '') {
				//game should be running
				return ;
			} else {
				console.log("Error with lobby invite: ", game);
			}
			return ;
		case (LobbyType.TOURNAMENT):
			const tournament: Tournament | undefined = await
				Tournament.accept_tournament_invite(user_id, display_name, invite, container);
			return ;
	}
}

export function destroyAllUsersUI() {
	const root = document.getElementById('all-users-ui-root');
	if (!root) return;

	unWireEvents(root);
	root.innerHTML = '';

	wsEvents.removeEventListener('lobby_invite', handleLobbyInvite);
}
