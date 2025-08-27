// src/features/chat/chat-state.ts
import { chatState } from './chat-init';
import type { StoredMsg } from '../types/types';

const unreadCounts = new Map<number, number>();
const chatUserNames = new Map<number, string>();

console.log(chatUserNames);
// console.log(unreadCounts);

//update the main floating badge with total unread
export function updateMainBadge(): void {
	const badge = document.getElementById('mainBadge');
	if (!badge) return;

	let anyUnread = false;
	for (const c of unreadCounts.values()) {
		if (c > 0) { anyUnread = true; break; }
	}

	badge.classList.toggle('hidden', !anyUnread);
}

//update or remove the unread badge next to a friend row
export function updateUnreadBadge(fromId: number): void {
	const count = unreadCounts.get(fromId) || 0;
	const mount = document.querySelector(
		`li[data-user-id="${fromId}"] .unread-message-appender`
	) as HTMLElement | null;
	if (!mount) return;

	let badge = mount.querySelector('.unread-badge') as HTMLElement | null;

	if (count > 0) {
		if (!badge) {
			badge = document.createElement('span');
			badge.className =
				'unread-badge ml-2 px-2 py-1 text-xs rounded-full ' +
				'text-red-500 border-2 border-red-500 ' +
				'bg-[#FAF9F6]';
			mount.appendChild(badge);
		}
		badge.textContent = `(${count})`;
	} else if (badge) {
		badge.remove();
	}

	updateMainBadge();
}

//load unread counters from session storage
export function loadUnreadCounts(): void {
	const stored = JSON.parse(sessionStorage.getItem('unreadCounts') || '{}') as Record<string, number>;
	for (const [id, unreadMsgCount] of Object.entries(stored)) {
		unreadCounts.set(parseInt(id, 10), unreadMsgCount);
	}
	updateMainBadge();
}

//save unread counters to session storage
export function saveUnreadCounts(): void {
	const obj: Record<string, number> = {};
	unreadCounts.forEach((unreadMsgCount, id) => {
		if (unreadMsgCount > 0) obj[id] = unreadMsgCount;
	});
	sessionStorage.setItem('unreadCounts', JSON.stringify(obj));
}

//append a new message bubble to the messages list
export function appendNewChatMessage(from: number, username: string, content: string, ts: number): void {
	const box = document.getElementById('messages')!;
	const isOwnMessage: boolean = from === chatState.myUserID;

	const align = isOwnMessage ? 'ml-auto text-right' : 'mr-auto text-left';
	const chatLine = isOwnMessage ? 'bg-[#f22667] text-white' : 'bg-[#181113] text-[#b99da6]';
	const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

	box.insertAdjacentHTML('beforeend', `
		<div class="max-w-[80%] ${align}">
			<div class="text-xs text-[#b99da6]">${username} . ${time}</div>
			<div class="mt-0.5 rounded-lg px-3 py-2 ${chatLine}">
				<p class="wrap-anywhere break-words">
					${content}
				</p>
			</div>
		</div>
	`);
	box.scrollTop = box.scrollHeight;
}

//load chat history for a friend and append the mssages
export function loadHistory(userID: number | null): void {
	if (userID === null) // no chat selected
		return;

	const box = document.getElementById('messages')!;
	box.innerHTML = '';

	const key = `chat_${userID}`;
	const msgs: StoredMsg[] = JSON.parse(sessionStorage.getItem(key) || '[]');

	// console.log(msgs);

	msgs.forEach(m => {
		const name = m.from === chatState.myUserID ?
			chatState.myUsername : (chatUserNames.get(m.from) || 'Unknown');
		appendNewChatMessage(m.from, name, m.content, m.ts);
	});

	box.scrollTop = box.scrollHeight;
}

//save one message to the session history and skip exact duplicates
export function saveToHistory(keyID: number, from: number, content: string, ts: number): void {
	const key = `chat_${keyID}`;
	const arr: { from: number; content: string; ts: number }[] =
		JSON.parse(sessionStorage.getItem(key) || '[]');

	const last = arr[arr.length - 1];
	if (last && last.content === content && last.ts === ts)
		return; //same message

	arr.push({ from, content, ts });
	sessionStorage.setItem(key, JSON.stringify(arr));
}

//clear all chat history and unread state
export function clearChatHistory(): void {
	sessionStorage.clear();
	unreadCounts.clear();
	updateMainBadge();
}

//prints that user is offline
export function appendSystemMessage(text: string): void {
	const box = document.getElementById('messages')!;
	if (!box)
		return;

	box.insertAdjacentHTML('beforeend',
		`<div class="mx-auto my-2 max-w-[80%] text-center text-xs text-[#b99da6]">${text}</div>`
	);

	box.scrollTop = box.scrollHeight;
}

export { unreadCounts, chatUserNames };
