// client/router.ts
export type PageModule = {               // contract every page must fulfil
	render(root: HTMLElement): void;
	// optional clean-up.
	// Still need to implement it.
	// Might need to remove listenders, awaits and so on fron the pages.
	// Need to research more about it.
	destroy?(): void;
	afterRender?(root: HTMLElement): void   // ← optional hook
  };

  type Loader = () => Promise<PageModule>;

  const routes: Record<string, Loader> = {
	'/':			() => import('./pages/home').then(m => m.default),
	'/about':		() => import('./pages/about').then(m => m.default),
	'/login':		() => import('./pages/login').then(m => m.default),
	'/register':	() => import('./pages/register').then(m => m.default),
	'/profile':		() => import('./pages/profile').then(m => m.default),
	'/users':		() => import('./pages/UsersPage').then(m => m.default),
  };

  export class Router {
	private current: PageModule | null = null;
	constructor(private outlet: HTMLElement) {
	  window.addEventListener('popstate', () => this.go(location.pathname));
	}

	async go(path: string) {
	  const load = routes[path] ?? routes['/'];         // fallback to home
	  const page = await load();
	  this.current?.destroy?.();
	  this.outlet.innerHTML = '';
	  page.render(this.outlet);
	  this.current = page;

	// testing here to get users on the screen from database
	if (typeof page.afterRender === 'function') {
		await page.afterRender(this.outlet)
	}
	}

	linkHandler = (e: MouseEvent) => {
	  const a = (e.target as HTMLElement).closest('[data-route]') as HTMLAnchorElement | null;
	  if (!a) return;
	  e.preventDefault();
	  const href = a.getAttribute('href')!;
	  history.pushState(null, '', href);
	  this.go(href);
	};
  }
