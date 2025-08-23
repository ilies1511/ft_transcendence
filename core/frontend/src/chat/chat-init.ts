// src/features/chat/chat-init.ts

import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';
import { template, wireEvents } from './chat-ui';
import { loadUnreadCounts, clearChatHistory } from './chat-state';
import { handleDirectMessage, handleChatError, fetchUsersAndPopulate } from './chat-handlers';

export const chatState = {
	activeChatFriendId: null as number | null,
	myUserId: 0,
	myUsername: ''
};

//refresh friendlist helper
const refresh = () => {
	if (chatState.myUserId)
		fetchUsersAndPopulate(chatState.myUserId);
};

export async function initFriendUI() {
	const root = document.getElementById('friend-ui-root')!;

	// fetch session
	const me = await getSession();
	if (!me || !me.id) {
		console.log('[LiveChat] user not logged in, not showing chat!');
		return;
	}
	chatState.myUserId = me.id;
	chatState.myUsername = me.username || 'You';

	root.innerHTML = template;

	// state
	loadUnreadCounts();
	fetchUsersAndPopulate(chatState.myUserId);

	wsEvents.addEventListener('direct_message', handleDirectMessage);
	wsEvents.addEventListener('error', handleChatError);
	// wsEvents.addEventListener('new_friend_request', refreshFriends);
	// wsEvents.addEventListener('friend_accepted', refreshFriends);
	// wsEvents.addEventListener('friend_rejected', refreshFriends);
	// wsEvents.addEventListener('friend_removed', refreshFriends);
	// document.addEventListener('friends-changed', refreshFriends);
	wsEvents.addEventListener('user_registered', refresh);

	wireEvents(root);
}

export function destroyFriendUI() {
	const root = document.getElementById('friend-ui-root');
	if (root) root.innerHTML = '';
	chatState.activeChatFriendId = null;

	clearChatHistory();

	wsEvents.removeEventListener('direct_message', handleDirectMessage);
	wsEvents.removeEventListener('error', handleChatError);
	// wsEvents.removeEventListener('new_friend_request', refreshFriends);
	// wsEvents.removeEventListener('friend_accepted', refreshFriends);
	// wsEvents.removeEventListener('friend_rejected', refreshFriends);
	// wsEvents.removeEventListener('friend_removed', refreshFriends);
	// document.removeEventListener('friends-changed', refreshFriends);
}
