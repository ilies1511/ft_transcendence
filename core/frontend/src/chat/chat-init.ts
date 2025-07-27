// src/features/chat/chat-init.ts  (updated: use shared mutable state object for currentChatUserId/myUserId/myUsername to allow assignments across modules)

import { getSession } from '../services/session';  // adjust path if needed
import { wsEvents } from '../services/websocket';  // shared WS
import { template, wireEvents } from './chat-ui';
import { loadUnreadCounts, clearChatHistory } from './chat-state';
import { handleDirectMessage, handleChatError, fetchFriendsAndPopulate } from './chat-handlers';

// Shared mutable state (allows assignments from other modules without TS errors)
export const chatState = {
	currentChatUserId: null as number | null,
	myUserId: 0,
	myUsername: ''
};

// Init entry point (call this once from your page, e.g., main.ts)
export async function initFriendUI() {
	const root = document.getElementById('friend-ui-root')!;

	// fetch session
	const me = await getSession();
	if (!me || !me.id) {
		root.innerHTML = '<p class="p-4 text-white">Please log in to use chat.</p>';
		return;
	}
	chatState.myUserId = me.id;
	chatState.myUsername = me.username || 'You';

	// paint UI
	root.innerHTML = template;

	// state
	loadUnreadCounts();
	fetchFriendsAndPopulate(chatState.myUserId);  // Use chatState

	// wire chat-specific WS listeners (these get removed in destroyFriendUI)
	wsEvents.addEventListener('direct_message', handleDirectMessage);
	wsEvents.addEventListener('error', handleChatError);

	wireEvents(root);
}

// Cleanup (called on logout, e.g., from main.ts)
export function destroyFriendUI() {
	const root = document.getElementById('friend-ui-root');
	if (root) root.innerHTML = '';
	chatState.currentChatUserId = null;  // Now mutable via object

	// Clear state (from chat-state.ts)
	clearChatHistory();  // Assume imported if needed

	// Remove chat-specific listeners
	wsEvents.removeEventListener('direct_message', handleDirectMessage);
	wsEvents.removeEventListener('error', handleChatError);
}
