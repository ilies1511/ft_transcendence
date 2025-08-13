import type { LobbyInvite, ServerError } from '../game/game_shared/message_types.ts';
import { getSession } from '../services/session';
import { Game } from '../game/game_new.ts';
import { Tournament } from '../game/Tournament.ts';
import { LobbyType } from '../game/game_shared/message_types.ts';
import {
	accept_lobby_invite,
	create_join_lobby,
	invite_user_to_lobby_skeleton,
	recv_lobby_invite_skeleton,
} from '../game/frontend_interface_examples/custom_lobbies.ts';


// src/ui/gameInviteToast.ts
import { showToast } from './toast-interface';

export function gameInviteToast(fromName:string) {
	// const acceptURL = `/api/requests/${requestId}/accept`;
	// const rejectURL = `/api/requests/${requestId}/reject`;
	
	showToast({
		title : 'Game invite',
		from : fromName,

		onAccept: async (): Promise<boolean> => {
			console.log('[GameInvite TOAST] accepted');
			if (!globalThis.last_invite) {
				console.log("Error: accepted invite but there was no invite");
				return true;
			}
			const invite: LobbyInvite = globalThis.last_invite;
			globalThis.last_invite = undefined;
			const me           = await getSession();
			const container    = document.querySelector<HTMLElement>('#game-container');

			if (!me || !container) {
				//todo: switch to 'Game Mode' page to fix this?
				console.log("Error: !me or !container when getting invite");
				return true;
			}
			const user_id      = me.id;
			const display_name = me.nickname ?? `player_${user_id}`;

			switch (invite.lobby_type) {
				case (LobbyType.INVALID):
					return true;
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
						return true;
					} else {
						console.log("Error with lobby invite: ", game);
					}
					return true;
				case (LobbyType.TOURNAMENT):
					const tournament: Tournament | undefined = await
						Tournament.accept_tournament_invite(user_id, display_name, invite, container);
					return true;
				default:
					console.log("Error: invite default case");
			}
			return true;
		},

		onReject: async (): Promise<boolean> => {
			console.log('[GameInvite TOAST] declined');
			globalThis.last_invite = undefined;
			return true;
		}
	});
}
