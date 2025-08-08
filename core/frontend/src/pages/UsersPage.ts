import type { PageModule } from '../router';
import { getSession } from '../services/session';

const UsersPage: PageModule = {
	render(root) {
		root.innerHTML = `
			<div class="min-h-screen bg-[#221116] flex flex-col items-center p-10">
				<h2 class="text-4xl text-white mb-8 font-semibold">Registered users</h2>
				<ul id="users-list" class="space-y-4 w-full max-w-2xl"></ul>
				<p id="empty-msg" class="text-[#ca91a3]">Loading...</p>
			</div>`;
	},

	async afterRender(root: HTMLElement) {
		const list	= root.querySelector<HTMLUListElement>('#users-list')!;
		const empty	= root.querySelector<HTMLParagraphElement>('#empty-msg')!;

		try {
			const me = await getSession();
			if (!me) throw new Error('Not logged in');

			const [usersRes, friendsRes, outRes, inRes] = await Promise.all([
				fetch('/api/users'),
				fetch(`/api/users/${me.id}/friends`),
				fetch(`/api/users/${me.id}/requests/outgoing`),
				fetch(`/api/users/${me.id}/requests/incoming`)
			]);
			if (!(usersRes.ok && friendsRes.ok && outRes.ok && inRes.ok))
				throw new Error('Failed to load friendship data');

			const users = await usersRes.json() as any[];
			const friends = (await friendsRes.json()).friends as { id: number }[];
			const outReq = await outRes.json() as { id: number; recipient_id: number }[];
			const inReq = await inRes.json() as { id: number; requester_id: number }[];

			const friendIds	 = new Set(friends.map(f => f.id));
			const outPending = new Map(outReq.map(r => [r.recipient_id, r.id]));
			const inPending	 = new Map(inReq.map(r => [r.requester_id, r.id]));

			if (!users.length) { empty.textContent = 'No users currently'; return; }
			empty.remove();

			list.innerHTML = users.map(u => {
				const isSelf	= u.id === me.id;
				const isFriend = friendIds.has(u.id);
				const sentByMe = outPending.has(u.id);
				const sentToMe = inPending.has(u.id);
				const reqIdIn	= inPending.get(u.id);

				let action = '';
				if (!isSelf && !isFriend) {
					if (sentByMe) {
						action = `<button disabled class="ml-2 text-sm px-3 py-1 rounded-md cursor-not-allowed">Pending…</button>`;
					} else if (sentToMe) {
						action = `<button class="accept-btn ml-2 bg-blue-800 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 cursor-pointer"
							data-requestid="${reqIdIn}" data-userid="${u.id}">Accept</button>`;
					} else {
						action = `<button class="invite-btn ml-2 bg-green-800 text-white text-sm px-3 py-1 rounded-md hover:bg-green-700 cursor-pointer"
							data-username="${u.username}" data-userid="${u.id}">Invite</button>`;
					}
				}

				return `
					<li class="bg-[#2b171e] rounded-xl p-5 sm:px-6 sm:py-5 text-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5">
						<span class="font-medium truncate flex items-center gap-2">
							<img src="/avatars/${u.avatar}" alt="avatar" class="h-6 w-6 rounded-full object-cover" />
							<a href="/profile/${u.id}" data-route class="hover:underline">${u.username}</a>
						</span>
						<span class="text-[#ca91a3] break-all sm:text-right sm:flex-shrink-0">${u.email}</span>
						${action}
					</li>`;
			}).join('');

			/* send request */
			list.querySelectorAll<HTMLButtonElement>('.invite-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const username = btn.dataset.username!;
					btn.disabled = true;
					btn.textContent = 'Sending…';
					try {
						const r = await fetch(`/api/users/${me.id}/requests`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ username })
						});
						if (!r.ok) throw new Error(await r.text());
						btn.classList.remove('bg-green-800', 'hover:bg-green-700', 'cursor-pointer');
						btn.classList.add('cursor-not-allowed');
						btn.textContent = 'Pending…';
					} catch {
						btn.disabled = false;
						btn.textContent = 'Invite';
					}
				});
			});

			/* accept request */
			list.querySelectorAll<HTMLButtonElement>('.accept-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const requestId = btn.dataset.requestid!;
					btn.disabled = true;
					btn.textContent = 'Accepting…';
					try {
						const r = await fetch(`/api/requests/${requestId}/accept`, { method: 'POST' });
						if (!r.ok) throw new Error(await r.text());
						btn.classList.remove('bg-blue-800', 'hover:bg-blue-700', 'cursor-pointer');
						btn.classList.add('bg-[#4c2d36]', 'cursor-not-allowed', 'text-[#ca91a3]');
						btn.textContent = 'Friend!';
					} catch {
						btn.disabled = false;
						btn.textContent = 'Accept';
					}
				});
			});
		} catch (err: any) {
			empty.textContent = `Error: ${err.message}`;
		}
	}
};

export default UsersPage;