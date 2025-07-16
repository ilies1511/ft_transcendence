import type { PageModule } from '../router';

const UsersPage: PageModule = {
	render(root) {
		root.innerHTML = `
			<div class="min-h-screen bg-[#221116] flex flex-col items-center p-10">
				<h2 class="text-4xl text-white mb-8 font-semibold">
					Registered users
				</h2>

				<!-- wider list & more space between items -->
				<ul id="users-list" class="space-y-4 w-full max-w-2xl"></ul>

				<p id="empty-msg" class="text-[#ca91a3]">Loading…</p>
			</div>`;
	},

	async afterRender(root: HTMLElement) {
		const list = root.querySelector<HTMLUListElement>('#users-list')!;
		const empty = root.querySelector<HTMLParagraphElement>('#empty-msg')!;

		try {
			// Fetch current user (assume /api/me returns { id, username })
			const meRes = await fetch('/api/me');
			if (!meRes.ok) throw new Error('Failed to fetch current user');
			const me = await meRes.json();

			const res = await fetch('/api/users');
			const users = res.ok ? await res.json() : null;

			if (users && users.length) {
				empty.remove();

				list.innerHTML = users
					.map((u: any) => {
						const isSelf = u.id === me.id;

						return `
							<li
								class="bg-[#2b171e] rounded-xl
									p-5 sm:px-6 sm:py-5
									text-lg text-white
									flex flex-col sm:flex-row sm:items-center
									justify-between gap-5">

								<span class="font-medium truncate flex items-center gap-2">
									<img src="/avatars/${u.avatar}" alt="avatar"
										class="h-6 w-6 rounded-full object-cover" />
									<a href="/profile/${u.id}" data-route class="hover:underline">
										${u.username}
									</a>
								</span>

								<span
									class="text-[#ca91a3] break-all
										sm:text-right sm:flex-shrink-0">
									${u.email}
								</span>

								${!isSelf /* && !isFriend */ ? `
									<button
										class="invite-btn ml-2 bg-[#ca91a3] text-white text-sm px-2 py-1 rounded-md hover:bg-[#b07d8e]"
										data-username="${u.username}"
										data-userid="${u.id}">
										+
									</button>
								` : ''}
							</li>
						`;
					})
					.join('');

				// Attach event listeners to invite buttons
				const buttons = list.querySelectorAll('.invite-btn');
				buttons.forEach(btn => {
					btn.addEventListener('click', async (e) => {
						const target = e.target as HTMLButtonElement;
						const username = target.dataset.username!;
						target.disabled = true;
						target.textContent = 'Sending...';

						try {
							const res = await fetch(`/api/users/${me.id}/requests`, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ username }),
							});
							if (!res.ok) throw new Error(await res.text());
							alert(`Friend request sent to ${username}!`);
							target.textContent = 'Sent';
						} catch (err) {
							alert(`Error sending request: ${err.message}`);
							target.disabled = false;
							target.textContent = '+';
						}
					});
				});

			} else {
				empty.textContent = 'No users currently';
			}
		} catch (err) {
			empty.textContent = `Error: ${err.message}`;
		}
	}
};

export default UsersPage;
