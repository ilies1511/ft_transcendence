// client/main.ts
import './style.css';
import { Router } from './router.ts';
import { initFriendUI } from './pages/friendUI.ts';


const root = document.querySelector<HTMLElement>('#app')!;
const router = new Router(root);

initFriendUI();

// global delegation for all future <a data-route>
document.addEventListener('click', router.linkHandler);

// first paint
router.go(location.pathname);
