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

// src/ui/inviteToast.ts
export async function inviteToast(fromName: string): Promise<void> {
	const box = document.createElement('div');
	box.className =
		`fixed top-6 right-6 z-[9999] w-80
		 rounded-xl border border-[#543b43] bg-[#2b171e]
		 shadow-lg text-white text-sm px-6 py-5 space-y-4`;

	box.innerHTML = /*html*/`
		<!-- header -->
		<div class="flex items-start gap-4">
			<div class="flex-1">
				<p class="text-base font-semibold tracking-wide">Game invite</p>
				<p class="text-[#b99da6]">from <span class="italic">${fromName}</span></p>
			</div>
			<button class="gi-close text-[#b99da6] hover:text-white text-lg leading-none">×</button>
		</div>

		<!-- stub buttons -->
		<div class="flex justify-end gap-3">
			<button data-act="decline"
				class="gi-btn h-8 w-8 rounded-md bg-[#D22B2B] hover:bg-[#b91c1c] text-lg">✗</button>
			<button data-act="accept"
				class="gi-btn h-8 w-8 rounded-md bg-[#0bda8e] hover:bg-[#0ac582] text-black text-lg">✓</button>
		</div>
	`;

	document.body.append(box);

	/* close via × */
	box.querySelector<HTMLButtonElement>('.gi-close')!
		.addEventListener('click', () => box.remove());

	/* demo click handlers */
	box.querySelectorAll<HTMLButtonElement>('.gi-btn')
		.forEach(btn =>
			btn.addEventListener('click', async () => {
				const act = btn.dataset.act; // "accept" | "decline"
				console.log(`[invite] ${act} clicked`);
				if (act == 'accept') {
					if (!globalThis.last_invite) {
						console.log("Error: accepted invite but there was no invite");
						return ;
					}
					const invite: LobbyInvite = globalThis.last_invite;

					const me           = await getSession();
					const container    = document.querySelector<HTMLElement>('#game-container');

					if (!me || !container) {
						//todo: switch to 'Game Mode' page to fix this?
						console.log("Error: !me or !container when getting invite");
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
						default:
							console.log("Error: invite default case");
					}
				} else {
				}
				box.remove();
			})
		);

	/* auto-dismiss after 10 s if untouched */
	// setTimeout(() => box.remove(), 10000);
}
