// src/features/chat/chat-init.ts

import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';
import { template, wireEvents } from './chat-ui';
import { loadUnreadCounts, clearChatHistory } from './chat-state';
import { handleDirectMessage, handleChatError, fetchUsersAndPopulate } from './chat-handlers';
import type { LobbyInvite } from '../game/game_shared/message_types.ts';
import { gameInviteToast } from '../ui/gameInviteToast';

//hold the chat runtime state
export const chatState = {
	activeChatUserID: null as number | null,
	myUserID: 0,
	myUsername: ''
};

//refresh friends list when user state changes
const refresh = () => {
	if (chatState.myUserID) fetchUsersAndPopulate(chatState.myUserID);
};

//mount the chat UI, wire events, and subscribe to WS events
export async function initFriendUI(): Promise<void> {
	const root = document.getElementById('friend-ui-root');
	if (!root) return;

	//fetch the current session; bail if not logged in
	const me = await getSession();
	if (!me || !me.id) {
		console.log('[LiveChat] user not logged in, not showing chat!');
		return;
	}

	chatState.myUserID = me.id;
	chatState.myUsername = me.username || 'You';

	//render static UI skeleton
	root.innerHTML = template;

	//load unread counters and populate list
	loadUnreadCounts();
	fetchUsersAndPopulate(chatState.myUserID);

	//subscribe to websocket events
	wsEvents.addEventListener('direct_message', handleDirectMessage);
	wsEvents.addEventListener('error', handleChatError);
	wsEvents.addEventListener('user_registered', refresh);
	wsEvents.addEventListener('lobby_invite', handleLobbyInvite);
	wsEvents.addEventListener('user_updated', refresh);

	//wire DOM-only UI events (open/close/send)
	wireEvents(root);

	//show lobby invite toast and store last invite
	function handleLobbyInvite(ev: Event) {
		const { from, content } = (ev as CustomEvent).detail;
		globalThis.last_invite = content as LobbyInvite;
		gameInviteToast(from);
		console.log('[LobbyInvite] from user', from, content);
	}
}

//unmount the chat UI and unsubscribe events
export function destroyFriendUI(): void {
	const root = document.getElementById('friend-ui-root');
	if (root) root.innerHTML = '';

	chatState.activeChatUserID = null;
	clearChatHistory();

	wsEvents.removeEventListener('direct_message', handleDirectMessage);
	wsEvents.removeEventListener('error', handleChatError);
	wsEvents.removeEventListener('user_registered', refresh);
	//leave lobby_invite listener as well if mounted
	wsEvents.removeEventListener('lobby_invite', () => {});
	wsEvents.removeEventListener('user_updated', refresh);
}
