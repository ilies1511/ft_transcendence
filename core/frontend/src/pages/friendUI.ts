// // frontend/src/pages/friendUI.ts  (updated: no more local ws; uses shared websocket.ts instead)

// // Changes:
// // - Removed local ws creation / onopen / onmessage
// // - In initFriendUI: addEventListener on wsEvents for 'direct_message' and 'error' (removed on destroy)
// // - In send handler: use sendWs() instead of ws.send
// // - Added removeEventListener in destroyFriendUI
// // - No other changes; the file is now a bit smaller as requested :)

// import { getSession } from '../services/session';  // your session service
// import { wsEvents, sendWs } from '../services/websocket';  // shared WS

// // ───────────────────────────────────────────────────────────────────────────────
// // Global state
// // ───────────────────────────────────────────────────────────────────────────────
// let currentChatUserId: number | null = null;
// let myUserId: number;
// let myUsername: string;

// const unreadCounts = new Map<number, number>();		// friendId → #unread
// const friendUsernames = new Map<number, string>();	// friendId → username

// // ───────────────────────────────────────────────────────────────────────────────
// // Init entry point (call this once from your page)
// // ───────────────────────────────────────────────────────────────────────────────
// export async function initFriendUI() {
// 	const root = document.getElementById('friend-ui-root')!;

// 	// fetch session
// 	const me = await getSession();
// 	if (!me || !me.id) {
// 		root.innerHTML = '<p class="p-4 text-white">Please log in to use chat.</p>';
// 		return;
// 	}
// 	myUserId = me.id;
// 	myUsername = me.username || 'You';

// 	// paint UI
// 	root.innerHTML = template;

// 	// state
// 	loadUnreadCounts();
// 	fetchFriendsAndPopulate(myUserId);

// 	// wire chat-specific WS listeners (these get removed in destroyFriendUI)
// 	wsEvents.addEventListener('direct_message', handleDirectMessage);
// 	wsEvents.addEventListener('error', handleChatError);

// 	wireEvents(root);
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // Static HTML skeleton
// // ───────────────────────────────────────────────────────────────────────────────
// const template = /*html*/ `
// 	<!-- floating button -->
// 	<button id="toggleBtn"
// 		class="fixed bottom-[60px] right-6 z-50 flex h-14 w-14 items-center justify-center
// 				rounded-full bg-[#f22667] text-white shadow-lg hover:bg-[#d71d59]">
// 	💬
// 	<span id="mainBadge"
// 		class="absolute top-0 right-0 text-xs bg-red-500 text-white rounded-full px-1 py-0 hidden">!</span>
// 	</button>

// 	<!-- wrapper -->
// 	<div id="panelWrapper"
// 		class="fixed bottom-[130px] right-6 z-40 w-72 hidden flex flex-col">

// 		<!-- friends -->
// 		<div id="friendsPanel"
// 			class="space-y-2 rounded-xl bg-[#2b171e] p-4 shadow-lg">
// 			<div class="flex items-center justify-between text-white">
// 				<h3 class="text-lg font-bold">Friends</h3>
// 				<button id="closePanel" class="text-xl leading-none">✕</button>
// 			</div>
// 			<ul id="friendsList" class="mt-3 space-y-2"></ul>
// 		</div>

// 		<!-- chat -->
// 		<div id="chatPanel"
// 			class="hidden flex flex-col h-[320px] rounded-xl bg-[#2b171e] p-4 shadow-lg">
// 			<div class="mb-2 flex items-center justify-between text-white">
// 				<button id="backBtn"	class="text-xl leading-none">←</button>
// 				<h3 id="chatUser"		class="font-bold"></h3>
// 				<button id="closeChat"	class="text-xl leading-none">✕</button>
// 			</div>
// 			<div id="messages"
// 				class="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 text-[#b99da6]">
// 			</div>
// 			<form id="msgForm" class="mt-2 flex">
// 				<input id="msgInput"
// 					class="flex-1 rounded-l-lg bg-[#181113] p-2 text-white focus:outline-none"
// 					placeholder="Message…" autocomplete="off">
// 				<button
// 					class="rounded-r-lg bg-[#f22667] px-4 text-white">Send</button>
// 			</form>
// 		</div>
// 	</div>
// `;

// // ───────────────────────────────────────────────────────────────────────────────
// // Visibility helpers
// // ───────────────────────────────────────────────────────────────────────────────
// function showWrapper() {
// 	document.getElementById('panelWrapper')!.classList.remove('hidden');
// }
// function hideWrapper() {
// 	document.getElementById('panelWrapper')!.classList.add('hidden');
// }
// function showFriends() {
// 	const friendsPan = document.getElementById('friendsPanel') as HTMLElement;
// 	const chatPan	= document.getElementById('chatPanel') as HTMLElement;
// 	friendsPan.classList.remove('hidden');
// 	chatPan.classList.add('hidden');
// 	chatPan.style.display = 'none';
// 	currentChatUserId = null;
// 	document.getElementById('messages')!.innerHTML = '';
// 	updateMainBadge();
// }
// function showChat() {
// 	const friendsPan = document.getElementById('friendsPanel') as HTMLElement;
// 	const chatPan	= document.getElementById('chatPanel') as HTMLElement;
// 	friendsPan.classList.add('hidden');
// 	chatPan.classList.remove('hidden');
// 	chatPan.style.display = 'flex';
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // Badge utilities
// // ───────────────────────────────────────────────────────────────────────────────
// function updateMainBadge() {
// 	let total = 0;
// 	unreadCounts.forEach(c => total += c);
// 	document.getElementById('mainBadge')!
// 		.classList.toggle('hidden', total === 0);
// }
// function updateUnreadBadge(friendId: number) {
// 	const count = unreadCounts.get(friendId) || 0;
// 	const li = document.querySelector(
// 		`li[data-user-id="${friendId}"]`) as HTMLElement;

// 	if (!li) return;
// 	let badge = li.querySelector('.unread-badge') as HTMLElement | null;

// 	if (count > 0) {
// 		if (!badge) {
// 			badge = document.createElement('span');
// 			badge.className =
// 				'unread-badge ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-1';
// 			li.appendChild(badge);
// 		}
// 		badge.textContent = `(${count})`;
// 	} else if (badge) {
// 		badge.remove();
// 	}
// 	updateMainBadge();
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // sessionStorage persistence for unread counters
// // ───────────────────────────────────────────────────────────────────────────────
// function loadUnreadCounts() {
// 	const stored = JSON.parse(sessionStorage.getItem('unreadCounts') || '{}');
// 	for (const [id, cnt] of Object.entries(stored)) {
// 		unreadCounts.set(parseInt(id), cnt as number);
// 	}
// }
// function saveUnreadCounts() {
// 	const obj: { [k: string]: number } = {};
// 	unreadCounts.forEach((cnt, id) => {
// 		if (cnt > 0) obj[id] = cnt;
// 	});
// 	sessionStorage.setItem('unreadCounts', JSON.stringify(obj));
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // Fetch friends list
// // ───────────────────────────────────────────────────────────────────────────────
// async function fetchFriendsAndPopulate(userId: number) {
// 	const ul = document.getElementById('friendsList') as HTMLUListElement;
// 	ul.innerHTML = '<li class="text-[#b99da6]">Loading friends…</li>';

// 	try {
// 		const res = await fetch(`/api/users/${userId}/friends`);
// 		if (!res.ok) throw new Error('Failed to fetch friends');
// 		const data = await res.json();

// 		ul.innerHTML = '';
// 		if (!data.friends.length) {
// 			ul.innerHTML = '<li class="text-[#b99da6]">No friends yet.</li>';
// 			return;
// 		}

// 		friendUsernames.clear();
// 		data.friends.forEach((f: { id: number; username: string; }) => {
// 			friendUsernames.set(f.id, f.username);

// 			const li = document.createElement('li');
// 			li.dataset.userId = f.id.toString();
// 			li.textContent = f.username;
// 			li.className =
// 				'friendRow cursor-pointer rounded-lg bg-[#181113] px-3 py-2 text-white hover:bg-[#3c272d]';

// 			li.addEventListener('click', () => {
// 				currentChatUserId = f.id;
// 				(document.getElementById('chatUser')!).textContent = f.username;
// 				showChat();
// 				loadHistory(f.id);
// 				unreadCounts.set(f.id, 0);
// 				saveUnreadCounts();
// 				updateUnreadBadge(f.id);
// 				(document.getElementById('msgInput')! as HTMLInputElement).focus();
// 			});

// 			ul.appendChild(li);
// 			updateUnreadBadge(f.id);
// 		});
// 	} catch (err) {
// 		console.error(err);
// 		ul.innerHTML =
// 			'<li class="text-[#b99da6]">Error loading friends. Try again.</li>';
// 	}
// 	updateMainBadge();
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // WS handlers for chat (now listening on shared wsEvents)
// // ───────────────────────────────────────────────────────────────────────────────
// function handleDirectMessage(ev: Event) {
// 	const data = (ev as CustomEvent).detail;

// 	const fromId = data.from;

// 	// 1) ignore echo of my own outgoing messages
// 	if (fromId === myUserId) return;

// 	// 2) de-dupe: drop if identical msg already stored
// 	const key   = `chat_${fromId}`;
// 	const store = JSON.parse(sessionStorage.getItem(key) || '[]');
// 	const last  = store[store.length - 1];
// 	if (last && last.content === data.content && last.ts === data.ts) {
// 		return;	// already processed
// 	}

// 	const username = friendUsernames.get(fromId) || 'Unknown';

// 	if (currentChatUserId === fromId) {
// 		// chat is open → render immediately
// 		appendMessage(fromId, username, data.content, data.ts);
// 	} else {
// 		// chat not open → mark as unread
// 		const cnt = (unreadCounts.get(fromId) || 0) + 1;
// 		unreadCounts.set(fromId, cnt);
// 		saveUnreadCounts();
// 		updateUnreadBadge(fromId);

// 		if (Notification.permission === 'granted') {
// 			new Notification(`New message from ${username}`, { body: data.content });
// 		}
// 	}

// 	// 3) persist
// 	saveToHistory(fromId, fromId, data.content, data.ts);
// }

// function handleChatError(ev: Event) {
// 	const data = (ev as CustomEvent).detail;
// 	console.error('Chat error:', data.error);
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // Message helpers
// // ───────────────────────────────────────────────────────────────────────────────
// function appendMessage(from: number, username: string, content: string, ts: number) {
// 	const box = document.getElementById('messages')!;
// 	const align = from === myUserId ? 'ml-auto text-right' : 'mr-auto text-left';
// 	const bg	= from === myUserId ? 'bg-[#f22667] text-white' : 'bg-[#181113] text-[#b99da6]';
// 	const time	= new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// 	box.insertAdjacentHTML('beforeend', `
// 		<div class="max-w-[75%] mb-2 ${align}">
// 			<div class="flex justify-between items-center text-xs font-semibold text-gray-500 mb-1">
// 				<span>${username}</span><span>${time}</span>
// 			</div>
// 			<div class="rounded-lg px-3 py-2 text-sm break-words ${bg}">
// 				${content}
// 			</div>
// 		</div>
// 	`);
// 	box.scrollTop = box.scrollHeight;
// }

// // History (sessionStorage) ------------------------------------------------------
// function loadHistory(friendId: number | null) {
// 	if (friendId === null) return;
// 	const box = document.getElementById('messages')!;
// 	box.innerHTML = '';

// 	const key = `chat_${friendId}`;
// 	const msgs: { from: number; content: string; ts: number; }[] =
// 		JSON.parse(sessionStorage.getItem(key) || '[]');

// 	msgs.forEach(m =>
// 		appendMessage(
// 			m.from,
// 			m.from === myUserId ? myUsername : friendUsernames.get(m.from) || 'Unknown',
// 			m.content,
// 			m.ts
// 		)
// 	);
// 	box.scrollTop = box.scrollHeight;
// }

// function saveToHistory(keyId: number, from: number, content: string, ts: number) {
// 	const key = `chat_${keyId}`;
// 	const arr: { from: number; content: string; ts: number; }[] =
// 		JSON.parse(sessionStorage.getItem(key) || '[]');

// 	const last = arr[arr.length - 1];
// 	if (last && last.content === content && last.ts === ts) return;	// exact dup
// 	arr.push({ from, content, ts });
// 	sessionStorage.setItem(key, JSON.stringify(arr));
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // Wire all DOM events
// // ───────────────────────────────────────────────────────────────────────────────
// function wireEvents(root: HTMLElement) {
// 	const toggleBtn = root.querySelector<HTMLButtonElement>('#toggleBtn')!;
// 	const closePanel = root.querySelector<HTMLButtonElement>('#closePanel')!;
// 	const backBtn = root.querySelector<HTMLButtonElement>('#backBtn')!;
// 	const closeChat = root.querySelector<HTMLButtonElement>('#closeChat')!;
// 	const msgForm = root.querySelector<HTMLFormElement>('#msgForm')!;
// 	const msgInput = root.querySelector<HTMLInputElement>('#msgInput')!;
// 	const messagesBox = root.querySelector<HTMLElement>('#messages')!;

// 	// bubble toggle
// 	toggleBtn.addEventListener('click', () => {
// 		const hidden = document.getElementById('panelWrapper')!
// 			.classList.contains('hidden');
// 		hidden ? (showFriends(), showWrapper()) : hideWrapper();
// 	});

// 	// close icons
// 	closePanel.addEventListener('click', () => {
// 		hideWrapper();
// 		showFriends();
// 	});
// 	closeChat.addEventListener('click', () => {
// 		hideWrapper();
// 		showFriends();
// 	});

// 	// back button (inside chat)
// 	backBtn.addEventListener('click', showFriends);

// 	// send
// 	msgForm.addEventListener('submit', ev => {
// 		ev.preventDefault();
// 		if (!msgInput.value.trim() || !currentChatUserId) return;

// 		const ts = Date.now();

// 		// optimistic paint
// 		appendMessage(myUserId, myUsername, msgInput.value, ts);
// 		saveToHistory(currentChatUserId, myUserId, msgInput.value, ts);

// 		// websocket send (using shared)
// 		sendWs({
// 			type: 'direct_message',
// 			to: currentChatUserId,
// 			content: msgInput.value
// 		});

// 		msgInput.value = '';
// 		messagesBox.scrollTop = messagesBox.scrollHeight;
// 	});
// }

// // ───────────────────────────────────────────────────────────────────────────────
// // Cleanup helpers (optional)
// // ───────────────────────────────────────────────────────────────────────────────
// export function clearChatHistory() {
// 	sessionStorage.clear();
// 	unreadCounts.clear();
// 	updateMainBadge();
// }

// export function destroyFriendUI() {
// 	const root = document.getElementById('friend-ui-root');
// 	if (root) root.innerHTML = '';
// 	currentChatUserId = null;
// 	unreadCounts.clear();
// 	clearChatHistory();

// 	// Remove chat-specific listeners
// 	wsEvents.removeEventListener('direct_message', handleDirectMessage);
// 	wsEvents.removeEventListener('error', handleChatError);
// }
