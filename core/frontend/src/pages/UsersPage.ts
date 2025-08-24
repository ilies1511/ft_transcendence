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
		blockedIds: Set<number>;
	}
): string {
	const { meId, friendIds, outPending, inPending, blockedIds } = state;

	const isSelf = u.id === meId;
	const isFriend = friendIds.has(u.id);
	const sentByMe = outPending.has(u.id);
	const sentToMe = inPending.has(u.id);
	const reqIdIn = inPending.get(u.id);
	const isBlocked = blockedIds.has(u.id);

	let action = '';

	if (!isSelf) {
		if (isBlocked) {
			// Only Unblock if currently blocked
			action = `<div class="flex items-center gap-2">
                <button class="unblock-btn bg-yellow-700 text-white text-sm px-3 py-1 rounded-md hover:bg-yellow-600 cursor-pointer"
                    data-userid="${u.id}">Unblock</button>
            </div>`;
		} else {
			// Normal friendship actions (+ conditional Reject when incoming) + Block button (except when incoming)
			let friendAction = '';
			if (!isFriend) {
				if (sentByMe) {
					const reqIdOut = outPending.get(u.id);
					friendAction = `<button class="undo-invite-btn bg-gray-700 text-white text-sm px-3 py-1 rounded-md hover:bg-gray-600 cursor-pointer"
						data-requestid="${reqIdOut}" data-userid="${u.id}">Undo</button>`;
				} else if (sentToMe) {
					friendAction = `<button class="accept-btn bg-blue-800 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 cursor-pointer"
                        data-requestid="${reqIdIn}" data-userid="${u.id}">Accept</button>
                        <button class="reject-btn bg-red-800 text-white text-sm px-3 py-1 rounded-md hover:bg-red-700 cursor-pointer"
                        data-requestid="${reqIdIn}" data-userid="${u.id}">Reject</button>`;
				} else {
					friendAction = `<button class="invite-btn bg-green-800 text-white text-sm px-3 py-1 rounded-md hover:bg-green-700 cursor-pointer"
                        data-username="${u.username}" data-userid="${u.id}">Invite</button>`;
				}
			}
			const maybeBlock = (!sentToMe)
				? `<button class="block-btn bg-red-800 text-white text-sm px-3 py-1 rounded-md hover:bg-red-700 cursor-pointer"
                    data-userid="${u.id}">Block</button>`
				: '';
			action = `<div class="flex items-center gap-2">
                ${friendAction}
                ${maybeBlock}
            </div>`;
		}
	}

	// Ensure my own row always shows online (green) while I am on the site
	const online = isSelf ? true : !!u.live;

	return /*html*/`
		<li class="user-row group" data-uid="${u.id}">
			<a href="/profile/${u.id}" data-route
				class="flex items-center gap-3 min-w-0 flex-1 pr-6 focus:outline-none"
				aria-label="View profile of ${u.username}">
					<img src="${u.avatar}" alt="avatar of ${u.username}"
						class="h-10 w-10 rounded-xl object-cover ring-2 ring-[#3a2229] group-hover:ring-[#f22667] transition shrink-0" />
					<div class="min-w-0">
						<span
							class="font-semibold text-white group-hover:text-[#f22667] transition block truncate">
							${u.username}
						</span>
						<span
							class="text-xs text-[#b99da6] break-all truncate group-hover:text-[#f22667] transition">
							${u.email ?? ''}
						</span>
					</div>
			</a>
				<div class="hidden sm:flex items-center justify-center">
					<span class="status-dot ${online ? 'online' : 'offline'}"></span>
				</div>
				<div class="flex items-center justify-end gap-2 shrink-0 w-[150px]">
					${action}
				</div>
		</li>`;
}

const UsersPage: PageModule = {
	render(root) {
		root.innerHTML = `
			<div class="min-h-screen bg-[#221116] flex flex-col items-center px-4 py-10">
				<h2 class="text-4xl text-white mb-8 font-semibold tracking-wide">All Users</h2>
				<div class="w-full max-w-4xl rounded-2xl overflow-hidden shadow-lg users-card-wrapper">
					<div class="users-header hidden sm:grid" role="row">
						<div class="col-user">User</div>
						<div class="col-status">Status</div>
						<div class="col-actions">Actions</div>
					</div>
					<ul id="users-list" class="divide-y divide-[#3a2229]/70"></ul>
					<p id="empty-msg" class="text-center text-[#ca91a3] py-6">Loading...</p>
				</div>
			</div>`;
	},

	async afterRender(root: HTMLElement) {
		const list = root.querySelector<HTMLUListElement>('#users-list')!;
		const empty = root.querySelector<HTMLParagraphElement>('#empty-msg')!;

		const me = await getSession();
		if (!me) { empty.textContent = 'Not logged in'; return; }

		const refreshList = async () => {
			const [usersRes, friendsRes, outRes, inRes, blockedRes] = await Promise.all([
				fetch('/api/users'),
				// fetch(`/api/users/${me.id}/friends`),
				fetch(`/api/me/friends`),
				// fetch(`/api/users/${me.id}/requests/outgoing`),
				fetch(`/api/me/requests/outgoing`),
				// fetch(`/api/users/${me.id}/requests/incoming`),
				fetch('/api/me/requests/incoming'),
				// fetch(`/api/users/${me.id}/block`)
				fetch(`/api/me/block`)
			]);

			if (!(usersRes.ok && friendsRes.ok && outRes.ok && inRes.ok && blockedRes.ok)) {
				empty.textContent = 'Failed to load friendship data';
				return;
			}

			const users = await usersRes.json() as any[];
			const friends = (await friendsRes.json()).friends as { id: number }[];
			const outReq = await outRes.json() as { id: number; recipient_id: number }[];
			const inReq = await inRes.json() as { id: number; requester_id: number }[];
			const blockedArr = await blockedRes.json() as number[];

			const friendIds = new Set(friends.map(f => f.id));
			const outPending = new Map(outReq.map(r => [r.recipient_id, r.id]));
			const inPending = new Map(inReq.map(r => [r.requester_id, r.id]));
			const blockedIds = new Set(blockedArr);

			if (!users.length) { empty.textContent = 'No users currently'; return; }
			empty.remove();

			list.innerHTML = users
				.map(u => renderUserRow(u, { meId: me.id, friendIds, outPending, inPending, blockedIds }))
				.join('');

			attachRowListeners();// re-attach click handlers after each render
		};

		const attachRowListeners = () => {
			list.querySelectorAll<HTMLButtonElement>('.invite-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const username = btn.dataset.username!;
					btn.disabled = true; btn.textContent = 'Sending…';
					try {
						// const r = await fetch(`/api/users/${me.id}/requests`, {
						const r = await fetch(`/api/me/requests`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ username })
						});
						if (!r.ok) {
							if (r.status === 403) {
								const err = await r.json();
								alert(err.error || 'You cannot send an invite to this person.');
							}
							throw new Error(await r.text());
						}

						//local UI update
						document.dispatchEvent(new Event('friends-changed'));
					} catch {
						btn.disabled = false; btn.textContent = 'Invite';
					}
				});
			});

			// Undo outgoing invite
			list.querySelectorAll<HTMLButtonElement>('.undo-invite-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const requestId = btn.dataset.requestid!;
					btn.disabled = true; btn.textContent = 'Undoing…';
					try {
						const r = await fetch(`/api/users/${me.id}/requests/${requestId}`, { method: 'DELETE' });
						if (!r.ok) throw new Error(await r.text());
						document.dispatchEvent(new Event('friends-changed'));
					} catch {
						btn.disabled = false; btn.textContent = 'Undo';
					}
				});
			});

			// accept request
			list.querySelectorAll<HTMLButtonElement>('.accept-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const requestId = btn.dataset.requestid!;
					btn.disabled = true; btn.textContent = 'Accepting…';
					try {
						const r = await fetch(`/api/requests/${requestId}/accept`, { method: 'POST' });
						if (!r.ok) throw new Error(await r.text());
						document.dispatchEvent(new Event('friends-changed'));
					} catch {
						btn.disabled = false; btn.textContent = 'Accept';
					}
				});
			});

			// reject request
			list.querySelectorAll<HTMLButtonElement>('.reject-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const requestId = btn.dataset.requestid!;
					btn.disabled = true; btn.textContent = 'Rejecting…';
					try {
						const r = await fetch(`/api/requests/${requestId}/reject`, { method: 'POST' });
						if (!r.ok) throw new Error(await r.text());
						document.dispatchEvent(new Event('friends-changed'));
					} catch {
						btn.disabled = false; btn.textContent = 'Reject';
					}
				});
			});

			list.querySelectorAll<HTMLButtonElement>('.block-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const userId = btn.dataset.userid!;
					btn.disabled = true; btn.textContent = 'Blocking…';
					try {
						// const r = await fetch(`/api/users/${me.id}/block/${userId}`, { method: 'POST' });
						const r = await fetch(`/api/me/block/${userId}`, { method: 'POST' });
						if (!r.ok) throw new Error(await r.text());
						document.dispatchEvent(new Event('block-changed'));
						document.dispatchEvent(new Event('friends-changed')); // backend may remove friendship
					} catch {
						btn.disabled = false; btn.textContent = 'Block';
					}
				});
			});

			list.querySelectorAll<HTMLButtonElement>('.unblock-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const userId = btn.dataset.userid!;
					btn.disabled = true; btn.textContent = 'Unblocking…';
					try {
						// const r = await fetch(`/api/users/${me.id}/block/${userId}`, { method: 'DELETE' });
						const r = await fetch(`/api/me/block/${userId}`, { method: 'DELETE' });
						if (!r.ok) throw new Error(await r.text());
						document.dispatchEvent(new Event('block-changed'));
					} catch {
						btn.disabled = false; btn.textContent = 'Unblock';
					}
				});
			});
		};

		await refreshList();

		const onChange = () => refreshList();
		document.addEventListener('friends-changed', onChange);
		document.addEventListener('block-changed', onChange);
		wsEvents.addEventListener('new_friend_request', onChange);
		wsEvents.addEventListener('friend_accepted', onChange);
		wsEvents.addEventListener('friend_rejected', onChange);
		wsEvents.addEventListener('user_registered', onChange);
		wsEvents.addEventListener('friend_removed', onChange);

		(root as any).onDestroy = () => {
			document.removeEventListener('friends-changed', onChange);
			document.removeEventListener('block-changed', onChange);
			wsEvents.removeEventListener('new_friend_request', onChange);
			wsEvents.removeEventListener('friend_accepted', onChange);
			wsEvents.removeEventListener('friend_rejected', onChange);
			wsEvents.removeEventListener('user_registered', onChange);
			wsEvents.removeEventListener('friend_removed', onChange);
		};
	}
};

export default UsersPage;
