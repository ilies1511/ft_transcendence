import './style.css';
import { Router } from './router.ts';
import { initFriendUI, destroyFriendUI } from './chat/chat-init.ts';
import { initWs, closeWs } from './services/websocket';
import { presence } from './services/presence';
import { updateDot } from './utils/statusDot';
import type { FriendStatusMsg } from './types/types.ts';
import { refreshMenu } from './ui/menu';
import { refreshHeader } from './ui/header';
import { initFriendRequestWs, destroyFriendRequestWs } from './friends/friend-ws'
import { getSession, clearSession } from './services/session';

const root = document.querySelector<HTMLElement>('#app')!;
export const router = new Router(root);

document.addEventListener('click', router.linkHandler); // link delegation

// Fire auth-change once if a valid cookie already exists
(async () => {
	const user = await getSession();
	if (user) {
		document.dispatchEvent(new Event('auth-change'));
	}
})();

router.go(location.pathname);

document.addEventListener('auth-change', async () => {
	clearSession();
	const user = await getSession();
	console.log("main.ts 'auth-change' triggred");

	if (user) {
		initWs();
		presence.start();
		initFriendUI();
		initFriendRequestWs()
	} else {
		destroyFriendUI();
		destroyFriendRequestWs();
		presence.stop();
		closeWs();
	}
});

// Global handler for live-status updates
presence.addEventListener('friend-status', ev => {
	const { friendId, online } = (ev as CustomEvent<FriendStatusMsg>).detail;
	updateDot(friendId, online); // live == true / false
});

// Initial runs
refreshHeader();
refreshMenu();

// Event listeners
document.addEventListener('auth-change', refreshHeader);
document.addEventListener('auth-change', refreshMenu);
document.addEventListener('settings-update', refreshHeader);
document.addEventListener('settings-update', refreshMenu);  // TODO: Optional?
