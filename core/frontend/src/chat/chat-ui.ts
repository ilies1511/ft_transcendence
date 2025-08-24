// src/features/chat/chat-ui.ts
import { sendWs } from '../services/websocket';
import { appendNewChatMessage, saveToHistory } from './chat-state';
import { chatState } from './chat-init';
import { updateMainBadge } from './chat-state';
import { icons } from '../ui/icons';

export const template = /*html*/ `
	<button id="allChatBubbleButton"
		class="fixed bottom-[60px] right-6 z-50 flex h-14 w-14 items-center justify-center
			rounded-full bg-[#f22667] text-white hover:bg-[#d71d59] cursor-pointer">
		${icons.chat}
		<span id="mainBadge" class="absolute top-0 right-0 text-xs text-red-500 rounded-full bg-[#FFFDFA] px-1 py-0 hidden">!</span>
	</button>

	<div id="mainChatContainer"
		class="fixed bottom-[150px] right-6 z-40 w-80 hidden flex flex-col overflow-x-hidden">

		<div id="liveChatPanel" class="flex flex-col h-[230px] rounded-xl bg-[#2b171e] p-4">
			<div class="flex items-center justify-between text-white">
				<h3 class="text-lg font-bold">Live Chat</h3>
				<button id="closePanel" class="text-xl leading-none cursor-pointer" aria-label="Close live chat">
					${icons.closeX_micro}
				</button>
			</div>
			<ul id="userChatList" class="mt-3 space-y-2 flex-1 overflow-y-auto pr-2"></ul>
		</div>

		<div id="chatPanel" class="hidden flex flex-col h-[320px] rounded-xl bg-[#2b171e] p-4">
			<div class="mb-2 flex items-center justify-between text-white">
				<button id="backBtn" class="text-xl leading-none cursor-pointer" aria-label="Back to friends">
					${icons.back}
				</button>
				<div id="chatUser" class="flex items-center gap-2 font-bold"></div>
				<button id="closeChat" class="text-xl leading-none cursor-pointer" aria-label="Close chat">
					${icons.closeX_micro}
				</button>
			</div>

			<div id="messages" class="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 text-[#b99da6] text-base"></div>

			<form id="msgForm" class="mt-2 flex">
				<input id="msgInput"
					class="flex-1 rounded-l-lg bg-[#181113] p-2 text-white text-base focus:outline-none"
					placeholder="Message…" autocomplete="off">
				<button class="rounded-r-lg bg-[#f22667] px-4 text-white cursor-pointer" type="submit">Send</button>
			</form>
		</div>
	</div>
`;

//show the main chat container
export function showMainChatContainer(): void {
	document.getElementById('mainChatContainer')!.classList.remove('hidden');
}

//hide the main chat container
export function hideMainChatContainer(): void {
	document.getElementById('mainChatContainer')!.classList.add('hidden');
}

//show the friends list panel and reset chat state
export function showFriendsListPanel(): void {
	const friendsPan = document.getElementById('liveChatPanel') as HTMLElement;
	const chatPan = document.getElementById('chatPanel') as HTMLElement;

	friendsPan.classList.remove('hidden');
	chatPan.classList.add('hidden');

	chatState.activeChatUserID = null;
	document.getElementById('messages')!.innerHTML = '';
	updateMainBadge();
}

//show the active chat panel
export function showActiveChatPanel(): void {
	const friendsPan = document.getElementById('liveChatPanel') as HTMLElement;
	const chatPan = document.getElementById('chatPanel') as HTMLElement;

	friendsPan.classList.add('hidden');
	chatPan.classList.remove('hidden');
}

// DOM events (toggle bubble, close, back, send)
export function wireEvents(root: HTMLElement): void {
	const allChatBubbleButton = root.querySelector<HTMLButtonElement>('#allChatBubbleButton');
	if (!allChatBubbleButton) throw new Error('#allChatBubbleButton element not found');

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

	//toggle the chat bubble open/close
	allChatBubbleButton.addEventListener('click', () => {
		const mainChatContainer = document.getElementById('mainChatContainer')!;
		const hidden = mainChatContainer.classList.contains('hidden');

		if (hidden) {
			showFriendsListPanel();
			showMainChatContainer();
		} else {
			hideMainChatContainer();
			showFriendsListPanel();
		}
	});

	//close handlers for both panels
	closePanel.addEventListener('click', () => {
		hideMainChatContainer();
		showFriendsListPanel();
	});
	closeChat.addEventListener('click', () => {
		hideMainChatContainer();
		showFriendsListPanel();
	});

	//navigate back from chat to friends
	backBtn.addEventListener('click', showFriendsListPanel);

	//send message from the chat input
	msgForm.addEventListener('submit', ev => {
		ev.preventDefault();
		if (!msgInput.value.trim() || !chatState.activeChatUserID) return;

		const ts = Date.now();

		appendNewChatMessage(chatState.myUserID, chatState.myUsername, msgInput.value, ts);
		saveToHistory(chatState.activeChatUserID, chatState.myUserID, msgInput.value, ts);

		//send message via WS
		sendWs({
			type: 'direct_message',
			to: chatState.activeChatUserID,
			content: msgInput.value
		});

		msgInput.value = '';
		messages.scrollTop = messages.scrollHeight;
	});
}
