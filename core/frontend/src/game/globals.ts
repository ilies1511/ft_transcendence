export let is_unloading = false;

import { Game } from './game_new.ts';

// there can only be a signle game instance


window.addEventListener('beforeunload', () => {
	is_unloading = true;
});

export function generate_password(length: number = 16): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
	const array = new Uint32Array(length);
	crypto.getRandomValues(array);
	return (Array.from(array, (x) => chars[x % chars.length]).join(""));
}
