// frontend/src/main.ts
import './style.css'
import { Router } from './router.ts'
import { initFriendUI } from './pages/friendUI.ts'
import { currentUser, logout } from './services/auth'
import { initFriendsWs, closeFriendsWs } from './websocket.ts'
import { presence } from './services/presence'
import { updateDot } from './utils/statusDot'
import type { FriendStatusMsg } from './types/ws';

const root = document.querySelector<HTMLElement>('#app')!
export const router = new Router(root)

initFriendUI() // friend-list UI
document.addEventListener('click', router.linkHandler) // link delegation

/* fire auth-change once if a valid cookie already exists */
;(async () => {
	if (await currentUser())
		document.dispatchEvent(new Event('auth-change'))
})()

router.go(location.pathname)

document.addEventListener('auth-change', async () => {
	const user = await currentUser()

	if (user) {
		presence.start()
		initFriendsWs()
	} else {
		presence.stop()
		closeFriendsWs()
	}
})

/* global handler for live-status updates */
presence.addEventListener('friend-status', ev => {
	const { friendId, online } = (ev as CustomEvent<FriendStatusMsg>).detail
	updateDot(friendId, online) // live == true / false
})

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
document.addEventListener('auth-change', refreshHeader) // TODO: Test if actually needed
document.addEventListener('settings-update', refreshHeader)
