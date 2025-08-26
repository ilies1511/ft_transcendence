import { getSession } from '../services/session'

const PUBLIC_LINKS = [
	{ href:'/login', text:'Login' },
	{ href:'/register', text:'Register' }
]

const PRIVATE_LINKS = [
	{ href:'/', text:'Home', inMenu: false },
	{ href:'/modes', text:'Games', inMenu: true },
	{ href:'/users', text:'Users', inMenu: true },
	{ href:'/friendlist', text:'Friends', inMenu: true },
	{ href:'/profile', text:'Profile', inMenu: false },
	{ href:'/settings', text:'Settings', inMenu: false },
]

export async function refreshMenu() {
	const user = await getSession()
	const nav = document.getElementById('desktop-menu')
	const mobile = document.getElementById('mobile-menu-list')
	if (!nav || !mobile) return

	nav.innerHTML = ''
	mobile.innerHTML = ''

	const pool = user ? PRIVATE_LINKS : PUBLIC_LINKS
	const links = pool.filter(l => (l as any).inMenu ?? true)

	links.forEach(l => {
		const li = document.createElement('li')
		li.innerHTML = `<a class="text-sm sm:text-3xl" href="${l.href}" data-route>${l.text}</a>`
		nav.appendChild(li)
	})

	links.forEach(l => {
		const li = document.createElement('li')
		li.innerHTML =
			`<a href="${l.href}" data-route class="block py-2">${l.text}</a>`
		mobile.appendChild(li)
	})
}
