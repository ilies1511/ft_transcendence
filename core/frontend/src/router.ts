// client/router.ts
export type PageModule = {               // contract every page must fulfil
	render(root: HTMLElement): void;
	destroy?(): void;                      // optional clean-up
  };

  type Loader = () => Promise<PageModule>;

  const routes: Record<string, Loader> = {
	'/':			() => import('./pages/home').then(m => m.default),
	'/about':		() => import('./pages/about').then(m => m.default),
	'/login':		() => import('./pages/login').then(m => m.default),
	'/register':	() => import('./pages/register').then(m => m.default),
	'/profile':		() => import('./pages/profile').then(m => m.default),
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
