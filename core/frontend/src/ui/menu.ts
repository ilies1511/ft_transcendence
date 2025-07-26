import { getSession } from '../services/session';

const PUBLIC_LINKS = [
	{ href: '/login', text: 'Login' },
	{ href: '/register', text: 'Register' }
];

const PRIVATE_LINKS = [
	{ href: '/', text: 'Home' },
	{ href: '/about', text: 'About' },
	{ href: '/profile', text: 'Profile' },
	{ href: '/users', text: 'All users' },
	{ href: '/settings', text: 'Settings' },
	{ href: '/modes', text: 'Game Modes' },
	{ href: '/test', text: 'test' },
	{ href: '/friendlist', text: 'Friend list' }
];

export async function refreshMenu() {
	const user = await getSession();
	const desktopMenu = document.getElementById('desktop-menu');
	const mobileMenuList = document.getElementById('mobile-menu-list');

	if (!desktopMenu || !mobileMenuList) {
		console.error('Menu elements not found in DOM');
		return;
	}

	desktopMenu.innerHTML = '';
	mobileMenuList.innerHTML = '';

	const links = user ? PRIVATE_LINKS : PUBLIC_LINKS;

	links.forEach(link => {
		const li = document.createElement('li');
		li.innerHTML = `<a href="${link.href}" data-route>${link.text}</a>`;
		desktopMenu.appendChild(li);
	});

	links.forEach(link => {
		const li = document.createElement('li');
		li.innerHTML = `<a href="${link.href}" data-route class="block py-2">${link.text}</a>`;
		mobileMenuList.appendChild(li);
	});
}
