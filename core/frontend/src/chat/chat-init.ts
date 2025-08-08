// src/features/chat/chat-init.ts

import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';
import { template, wireEvents } from './chat-ui';
import { loadUnreadCounts, clearChatHistory } from './chat-state';
import { handleDirectMessage, handleChatError, fetchFriendsAndPopulate } from './chat-handlers';

export const chatState = {
	currentChatUserId: null as number | null,
	myUserId: 0,
	myUsername: ''
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
	fetchFriendsAndPopulate(chatState.myUserId);

	wsEvents.addEventListener('direct_message', handleDirectMessage);
	wsEvents.addEventListener('error', handleChatError);

	wireEvents(root);
}

export function destroyFriendUI() {
	const root = document.getElementById('friend-ui-root');
	if (root) root.innerHTML = '';
	chatState.currentChatUserId = null;

	clearChatHistory();

	wsEvents.removeEventListener('direct_message', handleDirectMessage);
	wsEvents.removeEventListener('error', handleChatError);
}
