// src/features/chat/chat-handlers.ts
import { showActiveChatPanel } from './chat-ui';
import {
	unreadCounts,
	chatUserNames,
	loadHistory,
	saveUnreadCounts,
	updateUnreadBadge,
	updateMainBadge,
	appendNewChatMessage,
	saveToHistory,
	appendSystemMessage
} from './chat-state';
import { chatState } from './chat-init';
import { sendWs } from '../services/websocket';
import type { LobbyInvite } from '../../src/game/game_shared/message_types.ts';
import { LobbyType } from '../../src/game/game_shared/message_types.ts';
import { icons } from '../ui/icons';
import { showToast } from '../ui/toast-interface.ts';

type User = { id: number; username: string; avatar: string };

function createInviteButton(userID: number): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = [
		'invite-btn',
		'relative group ml-auto flex items-center gap-1',
		'rounded bg-[#f22667] px-2 py-0.5 text-sm',
		'hover:bg-[#d71d59] cursor-pointer'
	].join(' ');
	btn.setAttribute('aria-label', 'Invite to play');
	btn.setAttribute('aria-describedby', `tip-${userID}`);

	//invite game icon
	const icon = document.createElement('span');
	icon.setAttribute('aria-hidden', 'true');
	icon.innerHTML = icons.game_invite;

	//tooltip
	const tip = document.createElement('span');
	tip.id = `tip-${userID}`;
	tip.setAttribute('role', 'tooltip');
	tip.className = [
		'pointer-events-none',
		'absolute right-full top-1/2 -translate-y-1/2 mr-2',
		'whitespace-nowrap rounded bg-black/70 px-2 py-1 text-xs text-white',
		'opacity-0 translate-x-2 transition-all duration-1000 ease-out',
		'group-hover:opacity-50 group-hover:translate-x-0',
		'z-50'
	].join(' ');
	tip.textContent = 'Invite to play';

	btn.append(icon, tip);
	return btn;
}

// friend <li> row in userChatList
function renderFriendRow(u: User): HTMLLIElement {
	const li = document.createElement('li');
	li.dataset.userId = String(u.id);
	li.className = [
		'friendRow',
		'flex items-center justify-between rounded-lg',
		'bg-[#181113] px-3 py-2 text-white hover:bg-[#3c272d]'
	].join(' ');

	const row = document.createElement('div');
	row.className = 'flex w-full items-center';

	const left = document.createElement('span');
	left.className = 'unread-message-appender flex items-center gap-2';

	const avatar = document.createElement('img');
	avatar.src = `/${u.avatar}`;
	avatar.alt = `${u.username} avatar`;
	avatar.className = 'h-5 w-5 shrink-0 rounded-full object-cover';

	const name = document.createElement('span');
	name.className = 'open-chat cursor-pointer hover:underline';
	name.textContent = u.username;

	left.append(avatar, name);

	const inviteBtn = createInviteButton(u.id);

	row.append(left, inviteBtn);
	li.append(row);

	return li;
}


// open chat and invite button
function wireUserListDelegation(): void {
	const ul = document.getElementById('userChatList') as HTMLUListElement | null;
	if (!ul) return;
	if (ul.dataset.delegated === '1') return;
	ul.dataset.delegated = '1';

	ul.addEventListener('click', ev => {
		const el = ev.target as HTMLElement;

		//invite button clicked
		const inviteBtn = el.closest<HTMLButtonElement>('.invite-btn');
		if (inviteBtn) {
			ev.stopPropagation();
			const li = inviteBtn.closest('li');
			if (!li) return;
			const id = Number(li.dataset.userId);
			if (!Number.isFinite(id)) return;
			handleInviteClick(inviteBtn, id);
			return;
		}

		//username clicked
		const open = el.closest<HTMLSpanElement>('.open-chat');
		if (open) {
			const li = open.closest('li');
			if (!li) return;
			const id = Number(li.dataset.userId);
			if (!Number.isFinite(id)) return;
			openChat(id);
		}
	});
}

//invite to game logic
function handleInviteClick(btn: HTMLButtonElement, toUserId: number): void {
	//ignore if already disabled
	if (btn.disabled) return;

	//disable the specific invite button for 5s
	btn.disabled = true;
	btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
	setTimeout(() => {
		btn.disabled = false;
		btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
	}, 5000);

	//build a default invite payload
	const invite: LobbyInvite = {
		map_name: '',
		lobby_password: '',
		lobby_id: -1,
		lobby_type: LobbyType.INVALID,
		valid: false
	};

	//fill invite from available global lobby state
	if (globalThis.tournament) {
		invite.lobby_type = LobbyType.TOURNAMENT;
		invite.lobby_password = globalThis.tournament.password;
		invite.lobby_id = globalThis.tournament.tournament_id;
		invite.valid = true;
	} else if (globalThis.game) {
		invite.lobby_type = globalThis.game.lobby_type;
		invite.lobby_password = globalThis.game.password;
		invite.lobby_id = globalThis.game.game_id;
		invite.map_name = globalThis.game.map_name;
		invite.valid = true;
	} else {
		//inform the user if not in a lobby
		showToast({ title: 'You are not in the lobby!' });
		return;
	}

	//send the websocket invite
	sendWs({ type: 'lobby_invite', to: toUserId, content: invite });
	console.log(`[invite] sent to user ${toUserId}`);
	console.log(JSON.stringify(invite, null, 2));
}

//open the chat panel for a user and reset unread counters
function openChat(userId: number): void {
	chatState.activeChatUserID = userId;

	const username = chatUserNames.get(userId) || 'Unknown';
	const li = document.querySelector<HTMLLIElement>(`li[data-user-id="${userId}"]`);
	const avatarSrc = li?.querySelector<HTMLImageElement>('img')?.src || '';

	document.getElementById('chatUser')!.innerHTML = `
		<a href="/profile/${userId}" data-route
			class="flex items-center gap-2 hover:underline">
			<img src="${avatarSrc}" class="h-5 w-5 rounded-full object-cover" alt="${username} avatar">
			${username}
		</a>`;

	showActiveChatPanel();
	loadHistory(userId);
	unreadCounts.set(userId, 0);
	saveUnreadCounts();
	updateUnreadBadge(userId);
	(document.getElementById('msgInput')! as HTMLInputElement).focus();
}

//fetch users and populate the friends list
export async function fetchUsersAndPopulate(myID: number): Promise<void> {
	const ul = document.getElementById('userChatList') as HTMLUListElement;
	ul.innerHTML = '';

	try {
		const res = await fetch('/api/users', {
			method: 'GET',
			credentials: 'include',
		});
		if (!res.ok) throw new Error('Failed to fetch users');

		const users = (await res.json()) as User[];
		const others = users.filter(u => u.id !== myID);

		if (!others.length) {
			ul.innerHTML = '<li class="text-sm p-2 text-gray-500">No registered users, its only you bro..</li>';
			updateMainBadge();
			return;
		}

		chatUserNames.clear();

		for (const u of others) {
			chatUserNames.set(u.id, u.username);
			const li = renderFriendRow(u);
			ul.appendChild(li);
			updateUnreadBadge(u.id);
		}

		wireUserListDelegation();
	} catch (err) {
		console.log(err);
		ul.innerHTML = '<li class="text-[#b99da6]">Error loading users. Try again.</li>';
	} finally {
		updateMainBadge();
	}
}


//handle incoming direct messages and unread counters
export function handleDirectMessage(ev: Event): void {
	const data = (ev as CustomEvent).detail;
	const fromID = data.from;

	//gnore echo of my own outgoing messages
	if (fromID === chatState.myUserID) return;

	//this is drop if same msg already stored
	const key = `chat_${fromID}`;
	const store = JSON.parse(sessionStorage.getItem(key) || '[]');
	const last = store[store.length - 1];
	if (last && last.content === data.content && last.ts === data.ts) return;

	const username = chatUserNames.get(fromID) || 'Unknown';

	if (chatState.activeChatUserID === fromID) {
		//tchat is open > render immediately
		appendNewChatMessage(fromID, username, data.content, data.ts);
	} else {
		//chat not open > mark as unread
		const cnt = (unreadCounts.get(fromID) || 0) + 1;
		unreadCounts.set(fromID, cnt);
		saveUnreadCounts();
		updateUnreadBadge(fromID);
	}

	saveToHistory(fromID, fromID, data.content, data.ts);
}

// //for offline users
// export function handleChatError(ev: Event): void {
// 	const { message } = (ev as CustomEvent).detail;
// 	appendSystemMessage(message || 'User OFFLINE - message not delivered.');
// }

export function handleChatError(ev: Event): void {
	const { error, message, code } = (ev as CustomEvent).detail as {
		error?: string; message?: string; code?: string;
	};
	const text = message ?? error ?? 'An unknown error occurred.';
	appendSystemMessage(text);
}
