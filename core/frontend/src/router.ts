import { getSession } from './services/session';

const GUEST_ONLY_ROUTES = ['/login', '/register']; // only for logged-out users
const OPEN_ROUTES = ['/terms', '/privacy']; // accessible to everyone
const LOGIN_REDIRECT = '/login'; // where guests are sent

export type PageModule = { // contract every page must fulfil
	render(root: HTMLElement): void;
	destroy?(): void;
	afterRender?(root: HTMLElement): void
	renderWithParams?(root: HTMLElement, params: Record<string, string>): void | Promise<void>; //for settings nad profiles
};

type Loader = () => Promise<PageModule>

const routes: Record<string, Loader> = {
	'/': () => import('./pages/home').then(m => m.default),
	'/login': () => import('./pages/login').then(m => m.default),
	'/register': () => import('./pages/register').then(m => m.default),
	'/modes': () => import('./pages/GameModes').then(m => m.default),
	// '/profile':  () => import('./pages/profile').then(m => m.default),
	'/users': () => import('./pages/UsersPage').then(m => m.default),
	'/profile/:id': () => import('./pages/profile').then(m => m.default),
	'/settings/:id': () => import('./pages/settings').then(m => m.default),
	'/friendlist': () => import('./pages/friendlist').then(m => m.default),
	'/terms': () => import('./pages/terms').then(m => m.default),
	'/privacy': () => import('./pages/privacy').then(m => m.default)
}

function matchDynamicRoute(path: string): { route: string, params: Record<string, string> } | null {
	const profileMatch = path.match(/^\/profile\/(\d+)$/);
	if (profileMatch) {
		return { route: '/profile/:id', params: { id: profileMatch[1] } };
	}

	const settingsMatch = path.match(/^\/settings\/(\d+)$/);
	if (settingsMatch) {
		return { route: '/settings/:id', params: { id: settingsMatch[1] } };
	}
	// Add more dynamic routes here if needed

	return null;
}

export class Router {
	private current: PageModule | null = null;

	constructor(private outlet: HTMLElement) {
		window.addEventListener('popstate', () => this.go(location.pathname, false));
	}

	async go(path: string, pushHistory = true): Promise<void> {
		// START - Router guard
		const user = await getSession();
		const currentUser = user; // For clarity
		const isGuestOnly = GUEST_ONLY_ROUTES.includes(path);
		const isOpen = OPEN_ROUTES.includes(path);

		// If user is logged in and tries to access guest-only page -> redirect (e.g. home)
		if (currentUser && isGuestOnly) {
			this.go('/');
			return;
		}

		// If user not logged in and route is neither open nor guest-only -> force login
		if (!currentUser && !isGuestOnly && !isOpen) {
			// notify the app so header/menu/ws teardown happen immediately
			document.dispatchEvent(new Event('auth-change'));
			this.go(LOGIN_REDIRECT);
			return;
		}
		// END - Router guard

		if (pushHistory && path !== location.pathname) {
			history.pushState(null, '', path);
		}

		// Handle static-to-dynamic redirects (e.g., /profile -> /profile/:id)
		if (path === '/profile' || path === '/settings') {
			if (user && user.id) {
				const dynamicPath = `${path}/${user.id}`;
				return this.go(dynamicPath, false); // No pushHistory to avoid loop
			} else {
				// session missing -> ensure UI switches to guest state
				document.dispatchEvent(new Event('auth-change'));
				return this.go('/login', false); // Guests to login
			}
		}

		let load = routes[path];
		let params: Record<string, string> = {};

		// If no static match, check for dynamic route
		if (!load) {
			const match = matchDynamicRoute(path);
			if (match) {
				load = routes[match.route];
				params = match.params;
			}
		}

		// Fallback to home if still no match (but only for truly unknown paths)
		if (!load) {
			console.warn(`No route found for ${path}, falling back to home`);
			load = routes['/'];
		}

		const page = await load();

		this.current?.destroy?.();
		this.outlet.innerHTML = '';

		// If the page supports renderWithParams and we have params, use it
		let usedParams = false;
		if (page.renderWithParams && Object.keys(params).length > 0) {
			await page.renderWithParams(this.outlet, params);
			usedParams = true;
		} else {
			page.render(this.outlet);
		}

		this.current = page;

		if (!usedParams && typeof page.afterRender === 'function') {
			await page.afterRender(this.outlet);
		}

	}

	// global click delegation for <a data-route>
	linkHandler = (e: MouseEvent) => {
		const a = (e.target as HTMLElement).closest('[data-route]') as HTMLAnchorElement | null;
		if (!a) return;
		e.preventDefault();
		this.go(a.getAttribute('href')!);
	}
}
