// client/main.ts
import './style.css';
import { Router } from './router.ts';
import { initFriendUI } from './pages/friendUI.ts';
import { currentUser, logout } from './services/auth'


const root = document.querySelector<HTMLElement>('#app')!;
export const router = new Router(root);

// this is for friend list
initFriendUI();

// global delegation for all future <a data-route>
document.addEventListener('click', router.linkHandler);

// first paint
router.go(location.pathname);



async function refreshHeader () {
	const span = document.getElementById('user-indicator')!
	const user = await currentUser()

	if (user) {
	  span.innerHTML = `👤 ${user.name} · <button id="logout" class="underline">Log out</button>`
	  span.querySelector<HTMLButtonElement>('#logout')!
		  .addEventListener('click', async () => {
			await logout()
			router.go('/login') // go to the login page after log out
		  })
	} else {
	  span.textContent = ''
	}
}

refreshHeader()                               // initial run
document.addEventListener('auth-change', refreshHeader)
