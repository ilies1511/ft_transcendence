import { sendWs } from '../services/websocket';
import type { LobbyInvite, LobbyType } from '../../src/game/game_shared/message_types.ts';

export async function fetchAndFill(myId: number) {
	const ul = document.getElementById('allList') as HTMLUListElement;
	ul.innerHTML = '<li class="text-[#b99da6]">Loading…</li>';

	try {
		const res = await fetch('/api/users');
		if (!res.ok) throw new Error('Fetch failed');
		const users = await res.json() as any[];

		if (!users.length) {
			ul.innerHTML = '<li class="text-[#b99da6]">No users yet.</li>';
			return;
		}
		ul.innerHTML = '';

		users.forEach((u: any) => {
			if (u.id === myId)
				return;

			const li = document.createElement('li');
			li.className = 'flex items-center justify-between rounded-lg px-3 py-2 bg-[#181113] text-white';

			// left part
			li.innerHTML = `
				<span class="truncate flex items-center gap-2">
					<img src="/avatars/${u.avatar}" class="h-5 w-5 rounded-full object-cover">
					<a href="/profile/${u.id}" data-route class="hover:underline">${u.username}</a>
				</span>
			`;

			// right part
			const btn = document.createElement('button');
			btn.className =
				'ml-2 bg-purple-800 text-white text-xs px-2 py-1 rounded-md hover:bg-purple-700';
			btn.textContent = '🎮 Invite';

			btn.addEventListener('click', () => {
				const invite: LobbyInvite = {
					map_name: 'map1',
					lobby_password: '123',
					lobby_id: 1,
					lobby_type: 1,
					valid: true
				};
				sendWs({
					type: 'lobby_invite',
					to: u.id,
					content: invite
				});
				console.log(`[invite] sent to user ${u.id}`);
				console.log(JSON.stringify(invite, null, 2));
				btn.disabled = true;
			});

			li.appendChild(btn);
			ul.appendChild(li);
		});
	} catch (err) {
		console.error(err);
		ul.innerHTML = '<li class="text-[#b99da6]">Error loading users.</li>';
	}
}
