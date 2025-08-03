// src/features/chat/chat-handlers.ts
import { showChat } from './chat-ui';
import { unreadCounts, friendUsernames, loadHistory, 
	saveUnreadCounts, updateUnreadBadge } from './chat-state';
import { chatState } from './chat-init';
import { appendMessage, saveToHistory } from './chat-state'; // for handleDirectMessage
import { updateMainBadge } from './chat-state'; // for fetchFriendsAndPopulate

// get friends list
export async function fetchFriendsAndPopulate(userId: number) {
	const ul = document.getElementById('friendsList') as HTMLUListElement;
	ul.innerHTML = '<li class="text-[#b99da6]">Loading friends…</li>';

	try {
		const res = await fetch(`/api/users/${userId}/friends`);
		if (!res.ok) throw new Error('Failed to fetch friends');
		const data = await res.json();

		ul.innerHTML = '';
		if (!data.friends.length) {
			ul.innerHTML = '<li class="text-[#b99da6]">No friends yet.</li>';
			return;
		}

		friendUsernames.clear();
		data.friends.forEach((f: { id: number; username: string; }) => {
			friendUsernames.set(f.id, f.username);

			const li = document.createElement('li');
			li.dataset.userId = f.id.toString();
			li.textContent = f.username;
			li.className =
				'friendRow cursor-pointer rounded-lg bg-[#181113] px-3 py-2 text-white hover:bg-[#3c272d]';

			li.addEventListener('click', () => {
				chatState.currentChatUserId = f.id;
				(document.getElementById('chatUser')!).textContent = f.username;
				showChat();
				loadHistory(f.id);
				unreadCounts.set(f.id, 0);
				saveUnreadCounts();
				updateUnreadBadge(f.id);
				(document.getElementById('msgInput')! as HTMLInputElement).focus();
			});

			ul.appendChild(li);
			updateUnreadBadge(f.id);
		});
	} catch (err) {
		console.error(err);
		ul.innerHTML =
			'<li class="text-[#b99da6]">Error loading friends. Try again.</li>';
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

	const username = friendUsernames.get(fromId) || 'Unknown';

	if (chatState.currentChatUserId === fromId) {
		// chat is open -> render immediately
		appendMessage(fromId, username, data.content, data.ts);
	} else {
		// chat not open -> mark as unread
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
	const data = (ev as CustomEvent).detail;
	console.error('Chat error:', data.error);
}
