import { currentUser, logout } from '../services/auth';
import { router } from '../main';

// TODO: Need to move this to a separate page/instance.
// Will need to add dropdown menu. On that menu there will be moved log out button.
// Also probably settings page.
// <avatar><username>
//     <logout button>
//     <settings button>
export async function refreshHeader() {
	const span = document.getElementById('user-indicator');
	if (!span) {
		console.error('User indicator element not found in DOM');
		return;
	}

	const user = await currentUser();

	if (user) {
		span.innerHTML = `
			<img src="/avatars/${user.avatar}" alt="avatar"
				 style="display:inline-block;vertical-align:middle;width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:6px;" />
			${user.nickname} · <button id="logout" class="underline">Log out</button>
		`;
		const logoutBtn = span.querySelector<HTMLButtonElement>('#logout');
		if (logoutBtn) {
			logoutBtn.addEventListener('click', async () => {
				await logout();
				router.go('/login');  // Go to the login page after log out
			});
		} else {
			console.error('Logout button not found in user indicator');
		}
	} else {
		span.textContent = '';
	}
}
