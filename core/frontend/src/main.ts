// frontend/src/main.ts
import './style.css';
import { Router } from './router.ts';
import { initFriendUI } from './pages/friendUI.ts';
import { currentUser, logout } from './services/auth'
// import { friendRequestToast } from './ui/toast';
import { initFriendsWs, closeFriendsWs } from './websocket.ts';

const root = document.querySelector<HTMLElement>('#app')!;
export const router = new Router(root);

// this is for friend list
initFriendUI();

// global delegation for all future <a data-route>
document.addEventListener('click', router.linkHandler);

// first paint
router.go(location.pathname);

// // friends invite websocket
// const friendsWs = new WebSocket('ws://localhost:5173/friends');

// // close ws on refresh/close website browser window
// window.addEventListener('beforeunload', () => friendsWs.close());

// friendsWs.onmessage = evt => {
// 	try {
// 		const data = JSON.parse(evt.data);
// 		if (data.type === 'new_friend_request') {
// 			friendRequestToast(data.requestId, data.from);
// 		}
// 	} catch {/* ignore non-JSON */}
// };

document.addEventListener('auth-change', async () => {
	const user = await currentUser();
	if (user) initFriendsWs();      // user just logged in
	else closeFriendsWs();     // user just logged out
});

// <avatar> <username> <logout button> TODO: need to move this to seperate page/ instance.
// Will need to add dropdown menu. On that menu there will be moved log out button.
// Also probably settings page.
//	<avatar><username>
//		<logout button>
//		<settings button>
async function refreshHeader () {
	const span = document.getElementById('user-indicator')!
	const user = await currentUser()

	if (user) {
	  span.innerHTML = `
		<img src="/avatars/${user.avatar}" alt="avatar"
			 style="display:inline-block;vertical-align:middle;width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:6px;" />
		${user.nickname} · <button id="logout" class="underline">Log out</button>
	  `
	  span.querySelector<HTMLButtonElement>('#logout')!
		  .addEventListener('click', async () => {
			await logout()
			router.go('/login') // go to the login page after log out
		  })
	} else {
	  span.textContent = ''
	}
}


refreshHeader() // initial run
document.addEventListener('auth-change', refreshHeader)
document.addEventListener('settings-update', refreshHeader)
