// frontend/src/pages/users.ts
import type { PageModule } from '../router';
import { getSession } from '../services/session';
import { wsEvents } from '../services/websocket';

function renderUserRow(
	u: any,
	state: {
		meId: number;
		friendIds: Set<number>;
		outPending: Map<number, number>;
		inPending: Map<number, number>;
	}
): string {
	const { meId, friendIds, outPending, inPending } = state;

	const isSelf = u.id === meId;
	const isFriend = friendIds.has(u.id);
	const sentByMe = outPending.has(u.id);
	const sentToMe = inPending.has(u.id);
	const reqIdIn = inPending.get(u.id);

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

	return /*html*/`
		<li class="bg-[#2b171e] rounded-xl p-5 sm:px-6 sm:py-5 text-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5"
			data-uid="${u.id}">
			<span class="font-medium truncate flex items-center gap-2">
				<img src="/avatars/${u.avatar}" alt="avatar" class="h-6 w-6 rounded-full object-cover" />
				<a href="/profile/${u.id}" data-route class="hover:underline">${u.username}</a>
			</span>
			<span class="text-[#ca91a3] break-all sm:text-right sm:flex-shrink-0">${u.email}</span>
			${action}
		</li>`;
}

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
		const list = root.querySelector<HTMLUListElement>('#users-list')!;
		const empty = root.querySelector<HTMLParagraphElement>('#empty-msg')!;

		const me = await getSession();
		if (!me) { empty.textContent = 'Not logged in'; return; }

		const refreshList = async () => {
			const [usersRes, friendsRes, outRes, inRes] = await Promise.all([
				fetch('/api/users'),
				fetch(`/api/users/${me.id}/friends`),
				fetch(`/api/users/${me.id}/requests/outgoing`),
				fetch(`/api/users/${me.id}/requests/incoming`)
			]);

			if (!(usersRes.ok && friendsRes.ok && outRes.ok && inRes.ok)) {
				empty.textContent = 'Failed to load friendship data';
				return;
			}

			const users = await usersRes.json() as any[];
			const friends = (await friendsRes.json()).friends as { id:number }[];
			const outReq = await outRes.json() as { id:number; recipient_id:number }[];
			const inReq = await inRes.json() as { id:number; requester_id:number }[];

			const friendIds = new Set(friends.map(f => f.id));
			const outPending = new Map(outReq.map(r => [r.recipient_id, r.id]));
			const inPending = new Map(inReq.map(r => [r.requester_id, r.id]));

			if (!users.length) { empty.textContent = 'No users currently'; return; }
			empty.remove();

			list.innerHTML = users
				.map(u => renderUserRow(u, { meId: me.id, friendIds, outPending, inPending }))
				.join('');

			attachRowListeners();// re-attach click handlers after each render
		};

		const attachRowListeners = () => {
			list.querySelectorAll<HTMLButtonElement>('.invite-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const username = btn.dataset.username!;
					btn.disabled = true; btn.textContent = 'Sending…';
					try {
						const r = await fetch(`/api/users/${me.id}/requests`, {
							method : 'POST',
							headers: { 'Content-Type':'application/json' },
							body : JSON.stringify({ username })
						});
						if (!r.ok) throw new Error(await r.text());

						//local UI update
						document.dispatchEvent(new Event('friends-changed'));
					} catch {
						btn.disabled = false; btn.textContent = 'Invite';
					}
				});
			});

			// accept request
			list.querySelectorAll<HTMLButtonElement>('.accept-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const requestId = btn.dataset.requestid!;
					btn.disabled = true; btn.textContent = 'Accepting…';
					try {
						const r = await fetch(`/api/requests/${requestId}/accept`, { method:'POST' });
						if (!r.ok) throw new Error(await r.text());

						document.dispatchEvent(new Event('friends-changed'));
					} catch {
						btn.disabled = false; btn.textContent = 'Accept';
					}
				});
			});
		};

		await refreshList();

		const onChange = () => refreshList();
		document.addEventListener('friends-changed', onChange);
		wsEvents.addEventListener('new_friend_request', onChange);
		wsEvents.addEventListener('friend_accepted', onChange);
		wsEvents.addEventListener('friend_rejected', onChange);

		(root as any).onDestroy = () => {
			document.removeEventListener('friends-changed', onChange);
			wsEvents.removeEventListener('new_friend_request', onChange);
			wsEvents.removeEventListener('friend_accepted', onChange);
			wsEvents.removeEventListener('friend_rejected', onChange);
		};
	}
};

export default UsersPage;
