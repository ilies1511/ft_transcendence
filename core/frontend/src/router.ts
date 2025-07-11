// client/router.ts
import { currentUser } from './services/auth'

export type PageModule = { // contract every page must fulfil
	render(root: HTMLElement): void;
	// optional clean-up.
	// Still need to implement it.
	// Might need to remove listenders, awaits and so on fron the pages.
	// Need to research more about it.
	destroy?(): void;
	afterRender?(root: HTMLElement): void   // ← optional hook
	renderWithParams?(root: HTMLElement, params: Record<string, string>): void | Promise<void>; //just a test for now 1144
  };

  type Loader = () => Promise<PageModule>

  const routes: Record<string, Loader> = {
	'/': () => import('./pages/home').then(m => m.default),
	'/about': () => import('./pages/about').then(m => m.default),
	'/login': () => import('./pages/login').then(m => m.default),
	'/register': () => import('./pages/register').then(m => m.default),
	'/modes': () => import('./pages/GameModes').then(m => m.default),
	'/test': () => import('./pages/test').then(m => m.default),
	// '/profile':  () => import('./pages/profile').then(m => m.default),
	'/users': () => import('./pages/UsersPage').then(m => m.default),
	'/profile/:id': () => import('./pages/profile').then(m => m.default),
	'/settings/:id': () => import('./pages/settings').then(m => m.default),

  }

  // Helper to match dynamic routes (e.g., /profile/123)  //just a test for now 1144
function matchDynamicRoute(path: string): { route: string, params: Record<string, string> } | null {
	// Only handle /profile/:id for now
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
	  if (pushHistory && path !== location.pathname) {
		history.pushState(null, '', path);
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

	  // Fallback to home if still no match
	  if (!load) load = routes['/'];

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

	  // for profile and redirections
	if (path === '/profile') {
		const user = await currentUser()
		if (user) {
		  return this.go(`/profile/${user.id}`, pushHistory)
		} else {
		  return this.go('/login', pushHistory)
		}
	}

	if (path === '/settings') {
		const user = await currentUser();
		if (user) {
			return this.go(`/settings/${user.id}`, pushHistory);
		} else {
			return this.go('/login', pushHistory);
		}
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
