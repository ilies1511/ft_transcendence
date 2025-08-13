// src/features/chat/chat-ui.ts
import { sendWs } from '../services/websocket';
import { appendMessage, saveToHistory } from './chat-state';
import { chatState } from './chat-init';
import { updateMainBadge } from './chat-state';
import { icons } from '../ui/icons';

// Static HTML skeleton
export const template = /*html*/ `
	<!-- floating button -->
	<button id="toggleBtn"
		class="fixed bottom-[60px] right-6 z-50 flex h-14 w-14 items-center justify-center
				rounded-full bg-[#f22667] text-white shadow-lg hover:bg-[#d71d59] cursor-pointer">
	${icons.chat}
	<span id="mainBadge"
		class="absolute top-0 right-0 text-xs bg-red-500 text-white rounded-full px-1 py-0 hidden">!</span>
	</button>

	<!-- wrapper -->
	<div id="panelWrapper"
		class="fixed bottom-[130px] right-6 z-40 w-72 hidden flex flex-col">

		<!-- friends -->
		<div id="friendsPanel"
			class="space-y-2 rounded-xl bg-[#2b171e] p-4 shadow-lg">
			<div class="flex items-center justify-between text-white">
				<h3 class="text-lg font-bold">Friends</h3>
				<button id="closePanel" class="text-xl leading-none cursor-pointer">
					${icons.closeX_micro}
				</button>
			</div>
			<ul id="friendsList" class="mt-3 space-y-2"></ul>
		</div>

		<!-- chat -->
		<div id="chatPanel"
			class="hidden flex flex-col h-[320px] rounded-xl bg-[#2b171e] p-4 shadow-lg">
			<div class="mb-2 flex items-center justify-between text-white">
				<button id="backBtn" class="text-xl leading-none">←</button>
				<h3 id="chatUser" class="font-bold"></h3>
				<button id="closeChat" class="text-xl leading-none cursor-pointer">
					${icons.closeX_micro}
				</button>
			</div>
			<div id="messages"
				class="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 text-[#b99da6]">
			</div>
			<form id="msgForm" class="mt-2 flex">
				<input id="msgInput"
					class="flex-1 rounded-l-lg bg-[#181113] p-2 text-white focus:outline-none"
					placeholder="Message…" autocomplete="off">
				<button
					class="rounded-r-lg bg-[#f22667] px-4 text-white">Send</button>
			</form>
		</div>
	</div>
`;

export function showWrapper() {
	document.getElementById('panelWrapper')!.classList.remove('hidden');
}
export function hideWrapper() {
	document.getElementById('panelWrapper')!.classList.add('hidden');
}
export function showFriends() {
	const friendsPan = document.getElementById('friendsPanel') as HTMLElement;
	const chatPan	= document.getElementById('chatPanel') as HTMLElement;
	friendsPan.classList.remove('hidden');
	chatPan.classList.add('hidden');
	chatPan.style.display = 'none';
	chatState.currentChatUserId = null;
	document.getElementById('messages')!.innerHTML = '';
	updateMainBadge();
}
export function showChat() {
	const friendsPan = document.getElementById('friendsPanel') as HTMLElement;
	const chatPan	= document.getElementById('chatPanel') as HTMLElement;
	friendsPan.classList.add('hidden');
	chatPan.classList.remove('hidden');
	chatPan.style.display = 'flex';
}

// wire DOM elements
export function wireEvents(root: HTMLElement) {
	const toggleBtn = root.querySelector<HTMLButtonElement>('#toggleBtn');
	if (!toggleBtn) throw new Error('#toggleBtn element not found');

	const closePanel = root.querySelector<HTMLButtonElement>('#closePanel');
	if (!closePanel) throw new Error('#closePanel element not found');

	const backBtn = root.querySelector<HTMLButtonElement>('#backBtn');
	if (!backBtn) throw new Error('#backBtn element not found');

	const closeChat = root.querySelector<HTMLButtonElement>('#closeChat');
	if (!closeChat) throw new Error('#closeChat element not found');

	const msgForm = root.querySelector<HTMLFormElement>('#msgForm');
	if (!msgForm) throw new Error('#msgForm element not found');

	const msgInput = root.querySelector<HTMLInputElement>('#msgInput');
	if (!msgInput) throw new Error('#msgInput element not found');

	const messages = root.querySelector<HTMLElement>('#messages');
	if (!messages) throw new Error('#messages element not found');

	// bubble toggle
	toggleBtn.addEventListener('click', () => {
		const wrapper = document.getElementById('panelWrapper')!;
		const hidden  = wrapper.classList.contains('hidden');

		if (hidden) {
			showFriends();
			showWrapper();
		} else {
			hideWrapper();
			showFriends();
		}
	});

	// close icons
	closePanel.addEventListener('click', () => {
		hideWrapper();
		showFriends();
	});
	closeChat.addEventListener('click', () => {
		hideWrapper();
		showFriends();
	});

	// back button (inside chat)
	backBtn.addEventListener('click', showFriends);

	// send
	msgForm.addEventListener('submit', ev => {
		ev.preventDefault();
		if (!msgInput.value.trim() || !chatState.currentChatUserId) return;

		const ts = Date.now();

		// optimistic paint
		appendMessage(chatState.myUserId, chatState.myUsername, msgInput.value, ts);
		saveToHistory(chatState.currentChatUserId, chatState.myUserId, msgInput.value, ts);

		// websocket send (using shared)
		sendWs({
			type: 'direct_message',
			to: chatState.currentChatUserId,
			content: msgInput.value
		});


		// TODO: refactor friends logic request
		// client.send(JSON.stringify({
		// 	type: 'new_friend_request',
		// 	requestId: fr.id,
		// 	from: sender.username
		// }));

		msgInput.value = '';
		messages.scrollTop = messages.scrollHeight;
	});
}
