// src/features/chat/chat-handlers.ts
import { showActiveChatPanel } from './chat-ui';
import { unreadCounts, chatUserNames, loadHistory,
	saveUnreadCounts, updateUnreadBadge, updateMainBadge } from './chat-state';
import { chatState } from './chat-init';
import { appendNewChatMessage, saveToHistory, appendSystemMessage } from './chat-state'; // for handleDirectMessage
import { sendWs } from '../services/websocket';
import type { LobbyInvite } from '../../src/game/game_shared/message_types.ts';
import { LobbyType } from '../../src/game/game_shared/message_types.ts';
import { icons } from '../ui/icons';

// get friends list
export async function fetchUsersAndPopulate(myID: number) {
	const ul = document.getElementById('userChatList') as HTMLUListElement;
	ul.innerHTML = '';

	try {
		const res = await fetch('/api/users');
		if (!res.ok)
			throw new Error('Failed to fetch users');
		const usersList = await res.json() as{
			id: number;
			username: string,
			avatar: string
		}[];

		const othersUsersList = usersList.filter((u: { id: number }) => u.id !== myID);
		if (!othersUsersList.length) {
			ul.innerHTML = '<li class="text-sm p-2 text-gray-500">No registered users, its only you bro..</li>';
			return;
		}

		chatUserNames.clear();

		othersUsersList.forEach(
			(u: { id: number; username: string; avatar: string }) => {

				chatUserNames.set(u.id, u.username);

				const li = document.createElement('li');
				li.dataset.userId = String(u.id);
				li.className =
					'friendRow flex items-center justify-between rounded-lg ' +
					'bg-[#181113] px-3 py-2 text-white hover:bg-[#3c272d]';

					li.innerHTML = `<div class="flex w-full items-center">

						<span class="unread-message-appender flex items-center gap-2">
							<img src="${u.avatar}" class="h-5 w-5 shrink-0 rounded-full object-cover">
							<span class="open-chat cursor-pointer hover:underline">${u.username}</span>
						</span>

						<button
							class="invite-btn ml-auto flex items-center gap-1
									rounded bg-[#f22667] px-2 py-0.5 text-sm
									hover:bg-[#d71d59] cursor-pointer">
							${icons.game_invite}
						</button>
					</div>

					<span class="unread-badge hidden ml-2 text-xs bg-red-500
						text-white rounded-full px-2 py-1"></span>
				`;

					// ul.appendChild(li);
					li.querySelector('.invite-btn')!.addEventListener('click', ev => {
						ev.stopPropagation(); // don’t open the DM
						const btn = ev.currentTarget as HTMLButtonElement;

						if (btn.disabled) return;

						btn.disabled = true;
						btn.classList.add(
							'opacity-50',
							'cursor-not-allowed',
							'pointer-events-none'
						);

						// Re-enable after 5 s
						setTimeout(() => {
							btn.disabled = false;
							btn.classList.remove(
								'opacity-50',
								'cursor-not-allowed',
								'pointer-events-none'
							);
						}, 5000);

						const invite: LobbyInvite = {
							map_name:        '',
							lobby_password:  '',
							lobby_id:        -1,
							lobby_type:      LobbyType.INVALID,
							valid:           false
						};

						if (globalThis.tournament) {
							invite.lobby_type     = LobbyType.TOURNAMENT;
							invite.lobby_password = globalThis.tournament.password;
							invite.lobby_id       = globalThis.tournament.tournament_id;
							// map_name not needed for a tournament
							invite.valid          = true;

						} else if (globalThis.game) {
							invite.lobby_type     = globalThis.game.lobby_type;
							invite.lobby_password = globalThis.game.password;
							invite.lobby_id       = globalThis.game.game_id;
							invite.map_name       = globalThis.game.map_name;
							invite.valid          = true;

						} else {
							// player is not in any lobby - do nothing
							return;
						}

						sendWs({
							type:    'lobby_invite',
							to:      u.id,
							content: invite
						});
						console.log(`[invite] sent to user ${u.id}`);
						console.log(JSON.stringify(invite, null, 2));

					});


					li.querySelector<HTMLSpanElement>('.open-chat')!.addEventListener('click', e => {
						e.preventDefault();					// stop default <a> navigation if any
						chatState.activeChatFriendId = u.id;

						document.getElementById('chatUser')!.innerHTML = `
							<a href="/profile/${u.id}" data-route
							   class="flex items-center gap-2 hover:underline">
								<img src="${u.avatar}" class="h-5 w-5 rounded-full object-cover">
								${u.username}
							</a>`;

						showActiveChatPanel();
						loadHistory(u.id);
						unreadCounts.set(u.id, 0);
						saveUnreadCounts();
						updateUnreadBadge(u.id);
						(document.getElementById('msgInput')! as HTMLInputElement).focus();
					});



				ul.appendChild(li);
				updateUnreadBadge(u.id);
			}
		);


	} catch (err) {
		console.error(err);
		ul.innerHTML =
			'<li class="text-[#b99da6]">Error loading users. Try again.</li>';
	}
	updateMainBadge();
}

// WS handlers for chat
export function handleDirectMessage(ev: Event) {
	const data = (ev as CustomEvent).detail;

	const fromId = data.from;

	// ignore echo of my own outgoing messages
	if (fromId === chatState.myUserId)
		return;

	// drop if same msg already stored
	const key = `chat_${fromId}`;
	const store = JSON.parse(sessionStorage.getItem(key) || '[]');
	const last = store[store.length - 1];
	if (last && last.content === data.content && last.ts === data.ts) {
		return;
	}

	const username = chatUserNames.get(fromId) || 'Unknown';

	if (chatState.activeChatFriendId === fromId) {
		// chat is open > render immediately
		appendNewChatMessage(fromId, username, data.content, data.ts);
	} else {
		// chat not open > mark as unread
		const cnt = (unreadCounts.get(fromId) || 0) + 1;
		unreadCounts.set(fromId, cnt);
		saveUnreadCounts();
		updateUnreadBadge(fromId);

		if (Notification.permission === 'granted') {
			new Notification(`New message from ${username}`, { body: data.content });
		}
	}
	saveToHistory(fromId, fromId, data.content, data.ts);
}

export function handleChatError(ev: Event) {
	const { message } = (ev as CustomEvent).detail
	appendSystemMessage(message || 'User is OFFLINE - message not delivered.')
}
