import { router } from '../main'
import { currentUser, logout } from '../services/auth'

export async function refreshHeader() {
	const span = document.getElementById('user-indicator')
	if (!span) return

	const user = await currentUser()
	if (!user) { span.textContent = ''; return }

	span.innerHTML = /*html*/`
		<div class="relative inline-block">
			<button id="avatarBtn"
					class="flex cursor-pointer items-center gap-3 select-none
							bg-[#2b171e]/60 hover:bg-[#392029]
							border-2 border-[#5a2e3b] hover:border-[#824155]
							rounded-lg px-3 py-0.5 shadow-sm hover:shadow
							transition-colors duration-150">
				<img src="${user.avatar}"
					 class="h-7 w-7 rounded-full object-cover">
				<span class="pr-1">${user.nickname}</span>
			</button>

			<ul id="userMenu"
				class="absolute right-0 mt-2 w-44 bg-[#2b171e] rounded-md overflow-hidden
				 shadow-lg text-white divide-y divide-[#41222b] hidden">
				<li><a data-route href="/profile"
						class="cursor-pointer block px-4 py-2 hover:bg-[#41222b]">
					Profile</a></li>
				<li><a data-route href="/friendlist"
						class="cursor-pointer block px-4 py-2 hover:bg-[#41222b]">
					Friends</a></li>
				<li><a data-route href="/settings"
						class="cursor-pointer block px-4 py-2 hover:bg-[#41222b]">
					Settings</a></li>

				<li><button id="logout"
						class="text-red-500 cursor-pointer w-full text-left px-4 py-2 hover:bg-[#41222b]">
					Log out
				</button></li>
			</ul>
		</div>
	`

	const menu = span.querySelector<HTMLUListElement>('#userMenu')!
	const toggle = span.querySelector<HTMLButtonElement>('#avatarBtn')!
	const links = menu.querySelectorAll('[data-route], button')

	toggle.onclick = () => menu.classList.toggle('hidden')

	links.forEach(el => el.addEventListener('click', () => {
		menu.classList.add('hidden')
	}))

	document.addEventListener('click', e => {
		if (!span.contains(e.target as Node)) menu.classList.add('hidden')
	})

	const logoutBtn = span.querySelector<HTMLButtonElement>('#logout')!
	logoutBtn.onclick = async () => { await logout(); router.go('/login') }
}

