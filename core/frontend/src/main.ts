// import './style.css'
// import typescriptLogo from './typescript.svg'
// import viteLogo from '/vite.svg'
// import { setupCounter } from './counter.ts'

// document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
//   <div>
//     <a href="https://vite.dev" target="_blank">
//       <img src="${viteLogo}" class="logo" alt="Vite logo" />
//     </a>
//     <a href="https://www.typescriptlang.org/" target="_blank">
//       <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
//     </a>
//     <h1>Vite + TypeScript</h1>
//     <div class="card">
//       <button id="counter" type="button"></button>
//     </div>
//     <p class="read-the-docs">
//       Click on the Vite and TypeScript logos to learn more
//     </p>
//   </div>
// `

// setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

// fetch('/api/ping')

import './style.css'
// import typescriptLogo from './typescript.svg'
// import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'
import aboutPage from './pages/about.ts';
import homePage from './pages/home.ts';
// import apiPage from './pages/apiPage.ts';
import { apiPage, setupApiPage } from './pages/apiPage.ts'; // Add
// import { apiPage } from './pages/apiPage.ts'; // Add
import type { GameOptions } from './game/game_shared/message_types.ts';
import {Game} from './game/game_new.ts';

// document.querySelector<HTMLDivElement>('#main')!.innerHTML = `

//       <div class="text-center">
//         <h1 class="text-3xl md:text-5xl font-bold mb-4">Welcome to MySite</h1>
//         <p class="text-gray-400 mb-8">A super simple responsive page using Tailwind CSS with a dark theme.</p>
//         <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition font-semibold">
//           Get Started
//         </button>
//       </div>
// `

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)


const routes: Record<string, () => string> = {
  home: homePage,
  about: aboutPage,
  apiPage: apiPage,
  // services: servicesPage,
  // ... add others
};

function getOrCreateUserId(): number {
  const key = 'pong-user-id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = (Math.floor(Math.random() * 1_000_000_000)).toString(); // Random number between 0 and 999,999,999
    sessionStorage.setItem(key, id);
  }
  return parseInt(id, 10);
}



function loadPage(page: string) {
  const main = document.querySelector('main');
  if (main && routes[page]) {
    main.innerHTML = routes[page]();

    // Attach event listeners after rendering
    if (page === 'apiPage') {
      setupApiPage();
    }
	//added game here because I don't know where it is supposed to be
	if (main) {
	 	const options: GameOptions = {
	 		player_count: 1,
	 		timer: 10,
	 		no_tie: false,
	 	};
	 	main.innerHTML = '';
	 	//const userId = Math.random();
	 	const userId = getOrCreateUserId();
		console.log("userId: ", userId);
	 	//const userId = 222;
	 	new Game(userId, main, options);
	 }
  }
}

// Listen for menu clicks
document.querySelectorAll('[data-page]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = (e.target as HTMLElement).getAttribute('data-page');
    if (page) {
      loadPage(page);
      history.pushState({ page }, '', ''); // This keeps the URL unchanged
    }
  });
});

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
  const page = event.state?.page || 'home';
  loadPage(page);
});

// Load home page by default
window.addEventListener('DOMContentLoaded', () => {
  loadPage('home');
});

// Update WebSocket connection to use proxy
// const ws = new WebSocket('ws://localhost:5173/ws') // Vite proxy

// If using Vite proxy, use ws://localhost:5173/ws
// const ws = new WebSocket('ws://localhost:5173/ws')

// ws.addEventListener('open', () => {
//   console.log('[FRONT-END PART] WebSocket connected!')
//   ws.send('[FRONT-END PART] Hello from the browser!')
// })

// ws.addEventListener('message', (event) => {
//   console.log('[FRONT-END PART] Received from server:', event.data)
//   // You can also display this in your page if you want
// })

