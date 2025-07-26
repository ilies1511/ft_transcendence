export let is_unloading = false;

import { Game } from './game_new.ts';

// there can only be a signle game instance

window.addEventListener('beforeunload', () => {
  is_unloading = true;
});


