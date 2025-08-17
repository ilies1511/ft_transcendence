// frontend/src/pages/profile.ts
import type { PageModule } from '../router';
import type { ApiUser } from '../types/api';
// import { getSession } from '../services/auth'
import { router } from '../main';
import { getSession } from '../services/session';
import { isFriend } from '../utils/isFriend';
import { updateDot } from '../utils/statusDot';


const template = /*html*/ `
	<div class="w-full max-w-6xl mx-auto p-6 space-y-6">
		<!-- avatar + name -->
		<header class="flex flex-col items-center gap-4">
			<img id="profileAvatar"
				src="#s"
				alt="avatar"
				class="h-32 w-32 rounded-full object-cover">

			<div class="text-center">
			<div class="flex items-center justify-center gap-2">
				<h1 id="profileName" class="text-2xl font-bold text-white"></h1>
				<span id="profileStatus" class="h-3 w-3 rounded-full hidden" data-user-id=""></span>
			</div>
			<p id="profileHandle" class="text-[#b99da6]"></p>
			</div>
			<!-- actions -->
			<div id="profileActions" class="mt-2 flex gap-3"></div>
		</header>

		<!-- stats -->
		<section class="flex flex-wrap gap-3 px-4">
			<div class="flex flex-1 min-w-[110px] flex-col items-center gap-2 rounded-lg border border-[#543b43] p-3">
			<p class="text-2xl font-bold text-white">120</p>
			<p class="text-sm text-[#b99da6]">Matches</p>
			</div>

			<div class="flex flex-1 min-w-[110px] flex-col items-center gap-2 rounded-lg border border-[#543b43] p-3">
			<p class="text-2xl font-bold text-white">80</p>
			<p class="text-sm text-[#b99da6]">Wins</p>
			</div>

			<div class="flex flex-1 min-w-[110px] flex-col items-center gap-2 rounded-lg border border-[#543b43] p-3">
			<p class="text-2xl font-bold text-white">40</p>
			<p class="text-sm text-[#b99da6]">Losses</p>
			</div>
		</section>

		<!-- match history -->
		<section class="space-y-4">
			<h2 class="px-4 text-xl font-bold text-white">Match History</h2>

			<div class="mx-4 overflow-x-auto rounded-xl border border-[#543b43] bg-[#181113]">
			<table class="min-w-[640px] w-full text-left">
				<thead class="bg-[#271c1f] text-white">
				<tr>
					<th class="px-4 py-3">Date</th>
					<th class="px-4 py-3">Opponent</th>
					<th class="px-4 py-3">Result</th>
					<th class="px-4 py-3">Score</th>
				</tr>
				</thead>

				<tbody class="divide-y divide-[#543b43]">
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-15</td>
					<td class="px-4 py-3 text-white">Ethan Harper</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
					<td class="px-4 py-3 text-[#b99da6]">21-18</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-12</td>
					<td class="px-4 py-3 text-white">Olivia Zhang</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
					<td class="px-4 py-3 text-[#b99da6]">19-21</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-10</td>
					<td class="px-4 py-3 text-white">Nathan Taylor</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
					<td class="px-4 py-3 text-[#b99da6]">21-15</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-08</td>
					<td class="px-4 py-3 text-white">Chloe Evans</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
					<td class="px-4 py-3 text-[#b99da6]">21-17</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
					<td class="px-4 py-3 text-white">Ryan Clark</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
					<td class="px-4 py-3 text-[#b99da6]">16-21</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
					<td class="px-4 py-3 text-white">Ryan Clark</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
					<td class="px-4 py-3 text-[#b99da6]">16-21</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
					<td class="px-4 py-3 text-white">Ryan Clark</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
					<td class="px-4 py-3 text-[#b99da6]">16-21</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
					<td class="px-4 py-3 text-white">Ryan Clark</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
					<td class="px-4 py-3 text-[#b99da6]">16-21</td>
				</tr>
				<tr>
					<td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
					<td class="px-4 py-3 text-white">Ryan Clark</td>
					<td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
					<td class="px-4 py-3 text-[#b99da6]">16-21</td>
				</tr>
				</tbody>
			</table>
			</div>
		</section>
	</div>
`;

async function renderProfile(root: HTMLElement, user: ApiUser) {
	root.innerHTML = template

	root.querySelector<HTMLHeadingElement>('#profileName')!.textContent =
		user.nickname
	root.querySelector<HTMLParagraphElement>('#profileHandle')!.textContent =
		'@' + user.username.toLowerCase().replace(/\s+/g, '_')

	root.querySelector<HTMLImageElement>('#profileAvatar')!.src =
		`${user.avatar}`

	const dot = root.querySelector<HTMLSpanElement>('#profileStatus')!
	dot.dataset.userId = String(user.id)

	const me = await getSession();
	const isMe = me?.id === user.id;

	if (isMe) {
		updateDot(user.id, 1) // always green for yourself
		dot.classList.remove('hidden')
	} else if (await isFriend(user.id)) {
		updateDot(user.id, user.live) // 0 or 1
		dot.classList.remove('hidden')
	} else {
		dot.classList.add('hidden') // strangers see no dot
	}

	// const onStatus = (ev:Event) => {
	// 	const { friendId, online } = (ev as CustomEvent<FriendStatusMsg>).detail
	// 	if (friendId === user.id) updateDot(friendId, online);
	// }

	// // attach when the profile is shown
	// presence.addEventListener('friend-status', onStatus);

	// // detach when the route is left
	// (root as any).onDestroy = () => {
	// 	presence.removeEventListener('friend-status', onStatus)
	// }

	// Block / Unblock button
	if (!isMe && me) {
		const actions = root.querySelector<HTMLDivElement>('#profileActions')!;
		const applyState = (blocked: boolean, loading = false) => {
			actions.innerHTML = '';
			const btn = document.createElement('button');
			btn.className = `px-4 py-2 rounded-md text-sm font-semibold ${
				blocked ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-red-800 hover:bg-red-700'
			} text-white disabled:opacity-60`;
			btn.textContent = loading
				? (blocked ? 'Unblocking…' : 'Blocking…')
				: (blocked ? 'Unblock User' : 'Block User');
			btn.disabled = loading;
			btn.id = 'blockToggleBtn';
			actions.appendChild(btn);
			return btn;
		};

		let isBlocked = false;
		try {
			const r = await fetch(`/api/users/${me.id}/block`);
			if (r.ok) {
				const ids = await r.json() as number[];
				isBlocked = ids.includes(user.id);
			}
		} catch { /* ignore */ }

		let btn = applyState(isBlocked);

		btn.addEventListener('click', async () => {
			btn = applyState(isBlocked, true);
			try {
				const method = isBlocked ? 'DELETE' : 'POST';
				const r = await fetch(`/api/users/${me.id}/block/${user.id}`, { method });
				if (!r.ok) throw new Error(await r.text());
				isBlocked = !isBlocked;
				// If just blocked, hide status dot
				if (isBlocked) {
					dot.classList.add('hidden');
					document.dispatchEvent(new Event('friends-changed'));
				}
				document.dispatchEvent(new Event('block-changed'));
			} catch {
				// revert loading state
			} finally {
				applyState(isBlocked);
			}
		});
	}

	// TESTING USER STATS AND MACHES
	const stats = await fetchUserStats(user.id);
	const history = await fetchMatchHistory(user.id);
}

// Helper function for stats
async function fetchUserStats(userId: number) {
	try {
		const res = await fetch(`/api/users/${userId}/stats`);
		if (!res.ok) throw new Error(`stats ${res.status}`);
		const data = await res.json();
		console.log('⭐ user stats', data);
		return data;
	} catch (err) {
		console.error('Failed to load stats:', err);
		return null; // Or fallback data
	}
}

// Helper function for history
async function fetchMatchHistory(userId: number) {
	try {
		const res = await fetch(`/api/users/${userId}/matches`);
		if (!res.ok) throw new Error(`matches ${res.status}`);
		const data = await res.json();
		console.log('📜 match history', data);
		return data;
	} catch (err) {
		console.error('Failed to load history:', err);
		return []; // Empty array as fallback
	}
}

const onFriendsChanged = async () => {
	// are we still on the same profile?
	const dot = document.querySelector<HTMLSpanElement>('#profileStatus');
	if (!dot)
		return; // already updated
	const id = Number(dot.dataset.userId);

	// profile owner became a friend? → show dot
	if (await isFriend(id)) {
		dot.classList.remove('hidden');
		/* fetch fresh live flag so the first colour is correct */
		const r = await fetch(`/api/users/${id}`);
		const obj = await r.json() as ApiUser;
		updateDot(id, obj.live);
	}
};

document.addEventListener('friends-changed', onFriendsChanged, { once:true });

const ProfilePage: PageModule & { renderWithParams?: Function } = {
	render(root) {
		root.innerHTML = '<p>Loading profile...</p>'
	},

	// /profile/:id
	async renderWithParams(root, params) {
		root.innerHTML = '<p>Loading profile...</p>'

		if (params.id) {
			const res = await fetch(`/api/users/${params.id}`)
			if (!res.ok) { root.innerHTML = '<p>User not found</p>'; return }

			const user = await res.json() as ApiUser
			await renderProfile(root, user)
		} else {
			const me = await getSession()
			if (!me) { router.go('/login'); return }
			await renderProfile(root, { ...me, live: 1 } as ApiUser)
		}
	},

	// /profile (current user)
	async afterRender(root) {
		const me = await getSession()
		if (!me) { router.go('/login'); return }
		await renderProfile(root, { ...me, live: 1 } as ApiUser)
	}
}

export default ProfilePage