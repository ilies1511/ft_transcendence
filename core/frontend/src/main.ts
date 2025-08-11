import './style.css';
import { Router } from './router.ts';
import { initFriendUI, destroyFriendUI } from './chat/chat-init.ts';
import { currentUser } from './services/auth';
import { initWs, closeWs } from './services/websocket';
import { presence } from './services/presence';
import { updateDot } from './utils/statusDot';
import type { FriendStatusMsg } from './types/ws';
import { refreshMenu } from './ui/menu';
import { refreshHeader } from './ui/header';
import { initAllUsersUI, destroyAllUsersUI } from './all-users/all-users-init.ts';
import { initFriendRequestWs, destroyFriendRequestWs } from './friends/friend-ws'

const root = document.querySelector<HTMLElement>('#app')!;
export const router = new Router(root);

//TODO: REMOVE. CURRENTUSER, MOVE TO SESSION

// initFriendUI(); // friend-list UI
document.addEventListener('click', router.linkHandler); // link delegation

// Fire auth-change once if a valid cookie already exists
(async () => {
	if (await currentUser())
		document.dispatchEvent(new Event('auth-change'));
})();

router.go(location.pathname);

document.addEventListener('auth-change', async () => {
	const user = await currentUser();

	if (user) {
		initWs();
		presence.start();
		initFriendUI();
		initAllUsersUI();
		initFriendRequestWs()
	} else {
		destroyAllUsersUI(); 
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
