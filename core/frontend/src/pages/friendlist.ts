// frontend/src/pages/friends.ts
import type { PageModule } from '../router';
import { wsEvents } from '../services/websocket';
import { token as CSRFToken, getSession } from '../services/session';

type UserPreview = {
	id: number;
	username: string;
	avatar: string;
};

// build one list item
const row = (u:UserPreview, right = '') => /*html*/`
	<li class="bg-[#2b171e] rounded-xl p-5 sm:px-6 sm:py-5 text-lg text-white
		flex flex-col sm:flex-row sm:items-center justify-between gap-5"
		data-uid="${u.id}">
		<span class="font-medium truncate flex items-center gap-2">
			<img src="${u.avatar}" class="h-6 w-6 rounded-full object-cover">
			<a href="/profile/${u.id}" data-route class="hover:underline">${u.username}</a>
		</span>
		${right}
	</li>`;

// empty-state helper
const emptyMsg = (txt:string) => `<p class="text-[#ca91a3]">${txt}</p>`;

// fetch single user preview
async function getUser(id: number): Promise<UserPreview> {
	const response = await fetch(`/api/users/${id}`, {
		method: 'GET',
		credentials: 'include',
	});
	const userData = await response.json();

	return {
		id: userData.id,
		username: userData.username,
		avatar: userData.avatar
	};
}

const FriendListPage:PageModule = {
	render(root) {
		root.innerHTML = /*html*/`
			<div class="min-h-screen bg-[#221116] flex flex-col items-center p-10 space-y-10">
				<h2 class="text-4xl text-white font-semibold">Friends</h2>

				${['Incoming', 'Outgoing', 'Friends'].map(label => /*html*/`
					<section class="w-full max-w-2xl space-y-4">
						<h3 class="text-xl text-white">${label}</h3>
						<ul id="${label.toLowerCase()}" class="space-y-4"></ul>
						<div id="${label.toLowerCase()}-empty">${emptyMsg('Loading…')}</div>
					</section>`).join('')}
			</div>`;
	},

	async afterRender(root:HTMLElement) {
		// element refs
		const $in = root.querySelector<HTMLUListElement>('#incoming')!;
		const $out = root.querySelector<HTMLUListElement>('#outgoing')!;
		const $friends = root.querySelector<HTMLUListElement>('#friends')!;
		const $iEmpty = root.querySelector('#incoming-empty')!;
		const $oEmpty = root.querySelector('#outgoing-empty')!;
		const $fEmpty = root.querySelector('#friends-empty')!;

		// session
		const me = await getSession();
		if (!me) { $iEmpty.textContent = 'Not logged in'; return; }

		// refresh lists
		const refresh = async () => {
			const [inRes, outRes, frRes] = await Promise.all([
				fetch('/api/me/requests/incoming',{
					method: 'GET',
					credentials: 'include'
				}),
				fetch('/api/me/requests/outgoing', {
					method: 'GET',
					credentials: 'include'
				}),
				fetch('/api/me/friends', {
					method: 'GET',
					credentials: 'include'
				}),
			]);
			if (!(inRes.ok && outRes.ok && frRes.ok)) {
				$iEmpty.textContent = 'Failed to load';
				return;
			}

			const incoming = await inRes.json() as { id:number; requester_id:number }[];
			const outgoing = await outRes.json() as { id:number; recipient_id:number }[];
			const friendsR = await frRes.json();
			const friends = friendsR.friends ?? [];

			// incoming
			$in.innerHTML = '';
			if (incoming.length) {
				const users = await Promise.all(incoming.map(r => getUser(r.requester_id)));
				$in.innerHTML = users.map((u, i) => row(u, /*html*/`
					<div class="flex gap-2">
						<button class="act px-3 py-1 rounded-md bg-[#0bda8e] hover:bg-[#0ac582]"
							data-id="${incoming[i].id}" data-act="accept">✓</button>
						<button class="act px-3 py-1 rounded-md bg-[#D22B2B] hover:bg-[#b91c1c]"
							data-id="${incoming[i].id}" data-act="reject">✗</button>
					</div>`)).join('');
				$iEmpty.textContent = '';
			} else {
				$iEmpty.textContent = 'No incoming requests';
			}

			// outgoing
			$out.innerHTML = '';
			if (outgoing.length) {
				const users = await Promise.all(outgoing.map(r => getUser(r.recipient_id)));
				$out.innerHTML = users.map(u => row(u, '<span>Pending…</span>')).join('');
				$oEmpty.textContent = '';
			} else {
				$oEmpty.textContent = 'No outgoing requests';
			}

			// friends
			$friends.innerHTML = '';
			if (friends.length) {
				const users = typeof friends[0] === 'object'
					? friends as UserPreview[]
					: await Promise.all((friends as number[]).map(getUser));
				$friends.innerHTML = users.map(u => row(u, /*html*/`
					<button class="rm px-3 py-1 rounded-md bg-[#D22B2B] hover:bg-[#b91c1c]"
						data-id="${u.id}">Remove</button>`)).join('');
				$fEmpty.textContent = '';
			} else {
				$fEmpty.textContent = 'You have no friends';
			}

			attachHandlers();
		};

		// button handlers
		const attachHandlers = () => {
			root.querySelectorAll<HTMLButtonElement>('.act').forEach(btn => {
				btn.onclick = async () => {
					const li = btn.closest('li')!;
					btn.disabled = true;
					// const ok = await fetch(
					// 	`/api/requests/${btn.dataset.id}/${btn.dataset.act}`,
					// 	{ method:'POST' }
					// ).then(r => r.ok);
					const headers = new Headers({ 'Content-Type': 'application/json' });
					if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);

					const ok = await fetch(
						`/api/me/requests/${btn.dataset.id}/${btn.dataset.act}`,
						{
							method: 'POST',
							headers,
							credentials: 'include',
						}
					).then(r => r.ok);
					ok
						? (li.remove(), document.dispatchEvent(new Event('friends-changed')))
						: (alert('Server error'), btn.disabled = false);
				};
			});

			root.querySelectorAll<HTMLButtonElement>('.rm').forEach(btn => {
				btn.onclick = async () => {
					btn.disabled = true;
					// const ok = await fetch(
					// 	// `/api/users/${me.id}/friends/${btn.dataset.id}`,
					// 	`/api/me/friends/${btn.dataset.id}`,
					// 	{ method:'DELETE' }
					// ).then(r => r.ok);
					const headers = new Headers();
					if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);

					const ok = await fetch(`/api/me/friends/${btn.dataset.id}`,
						{
							method: 'DELETE',
							headers,
							credentials: 'include',
						}
					).then(r => r.ok);

					ok
						? document.dispatchEvent(new Event('friends-changed'))
						: (alert('Server error'), btn.disabled = false);
				};
			});
		};

		// initial load
		await refresh();

		// live updates
		const onChange = () => refresh();
		document.addEventListener('friends-changed', onChange);
		wsEvents.addEventListener('new_friend_request', onChange);
		wsEvents.addEventListener('friend_accepted', onChange);
		wsEvents.addEventListener('friend_rejected', onChange);
		wsEvents.addEventListener('friend_removed', onChange);

		// cleanup
		(root as any).onDestroy = () => {
			document.removeEventListener('friends-changed', onChange);
			wsEvents.removeEventListener('new_friend_request', onChange);
			wsEvents.removeEventListener('friend_accepted', onChange);
			wsEvents.removeEventListener('friend_rejected', onChange);
			wsEvents.removeEventListener('friend_removed', onChange);
		};
	}
};

export default FriendListPage;
