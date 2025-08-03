import './style.css';
import { Router } from './router.ts';
import { initFriendUI, destroyFriendUI } from './chat/chat-init.ts';
import { currentUser } from './services/auth';
// import { initFriendsWs, closeFriendsWs } from './websocket.ts';
import { initWs, closeWs } from './services/websocket';
import { presence } from './services/presence';
import { updateDot } from './utils/statusDot';
import type { FriendStatusMsg } from './types/ws';
import { refreshMenu } from './ui/menu';
import { refreshHeader } from './ui/header';

const root = document.querySelector<HTMLElement>('#app')!;
export const router = new Router(root);

// initFriendUI(); // friend-list UI
document.addEventListener('click', router.linkHandler); // link delegation

/* Fire auth-change once if a valid cookie already exists */
(async () => {
	if (await currentUser())
		document.dispatchEvent(new Event('auth-change'));
})();

router.go(location.pathname);

document.addEventListener('auth-change', async () => {
	const user = await currentUser();

	if (user) {
		presence.start();
		// initFriendsWs();
		initWs();
		initFriendUI();
	} else {
		presence.stop();
		// closeFriendsWs();
		closeWs();
		destroyFriendUI();
	}
});

/* Global handler for live-status updates */
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
