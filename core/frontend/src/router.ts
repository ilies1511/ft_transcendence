import { getSession } from './services/session'

const PUBLIC_ROUTES = ['/login', '/register']; // guest-only pages
const LOGIN_REDIRECT = '/login'; // where guests are sent

export type PageModule = { // contract every page must fulfil
	render(root: HTMLElement): void;
	// optional clean-up.
	// Still need to implement it.
	// Might need to remove listenders, awaits and so on fron the pages.
	// Need to research more about it.
	destroy?(): void;
	afterRender?(root: HTMLElement): void // ← optional hook
	renderWithParams?(root: HTMLElement, params: Record<string, string>): void | Promise<void>; //just a test for now 1144
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
		const isPublic = PUBLIC_ROUTES.includes(path);

		if (!user && !isPublic)
			return this.go(LOGIN_REDIRECT, true);

		if (user && isPublic)
			return this.go(`/profile/${user.id}`, true);
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
