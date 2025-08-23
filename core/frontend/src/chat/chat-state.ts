// src/features/chat/chat-state.ts
import { chatState } from './chat-init';
import type { StoredMsg } from '../types/types'

const unreadCounts = new Map<number, number>(); // friendId -> #unread
const chatUserNames = new Map<number, string>(); // friendId -> username

// badge utilities
export function updateMainBadge() {
	let total = 0;
	unreadCounts.forEach(c => total += c);
	document.getElementById('mainBadge')!
		.classList.toggle('hidden', total === 0);
}
export function updateUnreadBadge(friendId: number) {
	const count = unreadCounts.get(friendId) || 0;
	const li = document.querySelector(
		`li[data-user-id="${friendId}"]`) as HTMLElement;

	if (!li) return;
	let badge = li.querySelector('.unread-badge') as HTMLElement | null;

	if (count > 0) {
		if (!badge) {
			badge = document.createElement('span');
			badge.className =
				'unread-badge ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-1';
			li.appendChild(badge);
		}
		badge.textContent = `(${count})`;
	} else if (badge) {
		badge.remove();
	}
	updateMainBadge();
}

// sessionStorage for unread counters
export function loadUnreadCounts() {
	const stored = JSON.parse(sessionStorage.getItem('unreadCounts') || '{}');
	for (const [id, cnt] of Object.entries(stored)) {
		unreadCounts.set(parseInt(id), cnt as number);
	}
}
export function saveUnreadCounts() {
	const obj: { [k: string]: number } = {};
	unreadCounts.forEach((cnt, id) => {
		if (cnt > 0) obj[id] = cnt;
	});
	sessionStorage.setItem('unreadCounts', JSON.stringify(obj));
}


// message helpers (append, load, save history)
export function appendNewChatMessage(from: number, username: string, content: string, ts: number) {
	const box = document.getElementById('messages')!;

	let align: string;
	if (from === chatState.myUserId) {
		align = 'ml-auto text-right';
	} else {
		align = 'mr-auto text-left';
	}

	let bg: string;
	if (from === chatState.myUserId) {
		bg = 'bg-[#f22667] text-white';
	} else {
		bg = 'bg-[#181113] text-[#b99da6]';
	}

	const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	box.insertAdjacentHTML('beforeend', `
		<div class="max-w-[75%] mb-2 ${align}">
			<div class="flex justify-between items-center text-sm font-semibold mb-1 text-white">
				<span class="mr-1">${username}</span>
				<span>${time}</span>
			</div>
			<div class="rounded-lg px-3 py-2 text-base break-words text-white ${bg}">
				${content}
			</div>
		</div>
	`);
	box.scrollTop = box.scrollHeight;
}

export function loadHistory(friendId: number | null) {
	if (friendId === null) return;
	const box = document.getElementById('messages')!;
	box.innerHTML = '';

	const key = `chat_${friendId}`;
	const msgs: StoredMsg[] =
		JSON.parse(sessionStorage.getItem(key) || '[]');

	msgs.forEach(m => {
		let username: string;
		if (m.from === chatState.myUserId) {
			username = chatState.myUsername;
		} else {
			username = chatUserNames.get(m.from) || 'Unknown';
		}

		appendNewChatMessage(
			m.from,
			username,
			m.content,
			m.ts
		);
	});
	box.scrollTop = box.scrollHeight;
}

export function saveToHistory(keyId: number, from: number, content: string, ts: number) {
	const key = `chat_${keyId}`;
	const arr: { from: number; content: string; ts: number; }[] =
		JSON.parse(sessionStorage.getItem(key) || '[]');

	const last = arr[arr.length - 1];
	if (last && last.content === content && last.ts === ts)
		return;	// exact dup
	arr.push({ from, content, ts });
	sessionStorage.setItem(key, JSON.stringify(arr));
}

export function clearChatHistory() {
	sessionStorage.clear();
	unreadCounts.clear();
	updateMainBadge();
}

export { unreadCounts, chatUserNames };
