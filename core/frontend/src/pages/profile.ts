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
			<div id="profileActions" class="flex gap-3"></div>
		</header>

		<!-- stats -->
		<section class="grid gap-3 px-4
						grid-cols-2 sm:grid-cols-4
						lg:grid-cols-5 auto-rows-fr">
			<div class="rounded-lg border border-[#543b43] p-3 flex flex-col items-center justify-center">
				<p id="statTotal" class="text-2xl font-bold text-white">-</p>
				<p class="text-sm text-[#b99da6]">Matches</p>
			</div>

			<div class="rounded-lg border border-[#543b43] p-3 flex flex-col items-center justify-center">
				<p id="statWins" class="text-2xl font-bold text-white">-</p>
				<p class="text-sm text-[#b99da6]">Wins</p>
			</div>

			<div class="rounded-lg border border-[#543b43] p-3 flex flex-col items-center justify-center">
				<p id="statLosses" class="text-2xl font-bold text-white">-</p>
				<p class="text-sm text-[#b99da6]">Losses</p>
			</div>

			<div class="rounded-lg border border-[#543b43] p-3 flex flex-col items-center justify-center">
				<p id="statDraws" class="text-2xl font-bold text-white">-</p>
				<p class="text-sm text-[#b99da6]">Draws</p>
			</div>

			<!-- donut chart: spans 2 cols on small screens, 1 on lg -->
			<div class="rounded-lg border border-[#543b43] p-3 flex flex-col items-center justify-center
						col-span-2 sm:col-span-4 lg:col-span-1">
				<canvas id="statsChart" width="96" height="96"></canvas>
				<p class="mt-1 text-sm text-[#b99da6]">Win / Loss / Draw</p>
			</div>
		</section>

		<!-- match history -->
		<section class="space-y-4">
			<h2 class="px-4 text-xl font-bold text-white">Match History</h2>

			<div class="mx-4 overflow-x-auto rounded-xl border border-[#543b43] bg-[#181113]">
				<table class="min-w-[480px] w-full text-left">
					<thead class="bg-[#271c1f] text-white">
						<tr>
							<th class="px-4 py-3">Date</th>
							<th class="px-4 py-3">Opponent</th>
							<th class="px-4 py-3">Result</th>
							<th class="px-4 py-3">Score</th>
						</tr>
					</thead>
					<tbody id="matchHistoryBody" class="divide-y divide-[#543b43]">
						<tr><td colspan="4" class="px-4 py-4 text-center text-[#b99da6]">Loading...</td></tr>
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

	// TESTING USER STATS AND MACHES
	const stats = await fetchUserStats(user.id);
	if (stats) {
		renderStats(stats);
	}
	const history = await fetchMatchHistory(user.id);
	await renderMatchHistory(history, user.id);
	// draw chart after stats
	if (stats) drawStatsChart(stats);
}

// Helper function for stats
async function fetchUserStats(userId: number) {
	try {
		// const res = await fetch(`/api/users/${userId}/stats`);
		const res = await fetch(`/api/me/stats`);
		if (!res.ok) throw new Error(`stats ${res.status}`);
		const data = await res.json();
		console.log('⭐ user stats', data);
		return data;
	} catch (err) {
		console.error('Failed to load stats:', err);
		return null; // Or fallback data
	}
}

function renderStats(stats: any) {
		const setText = (id: string, val: any) => {
				const el = document.getElementById(id);
				if (el) el.textContent = String(val);
		};
		setText('statTotal', stats.totalGames ?? 0);
		setText('statWins', stats.wins ?? 0);
		setText('statLosses', stats.losses ?? 0);
		setText('statDraws', stats.draws ?? 0);
}

// Helper function for history
async function fetchMatchHistory(userId: number) {
	try {
		const res = await fetch(`/api/me/matches`);
		// const res = await fetch(`/api/users/${userId}/matches`);
		if (!res.ok) throw new Error(`matches ${res.status}`);
		const data = await res.json();
		console.log('📜 match history', data);
		return data;
	} catch (err) {
		console.error('Failed to load history:', err);
		return []; // Empty array as fallback
	}
}

async function fetchMatchParticipants(matchId: number) {
		try {
				const res = await fetch(`/api/matches/${matchId}/participants`);
				if (!res.ok) throw new Error(`participants ${res.status}`);
				return await res.json(); // always return data
		} catch (err) {
				console.error('Failed to load participants for match', matchId, err);
				return [];
		}
}

function formatDate(ts: number) {
		// backend stores UNIX seconds? Accept both ms / s
		if (ts < 10_000_000_000) ts = ts * 1000;
		return new Date(ts).toISOString().slice(0, 10);
}

async function renderMatchHistory(history: any[], userId: number) {
		const tbody = document.getElementById('matchHistoryBody');
		if (!tbody) return;
		if (!history.length) {
				tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-[#b99da6]">No matches yet</td></tr>`;
				return;
		}
		const participantPromises = history.map(h => fetchMatchParticipants(h.match.id));
		const participantsList = await Promise.all(participantPromises);

		const rowsHtml = history.map((h, idx) => {
				const participants = participantsList[idx] || [];
				const others = participants.filter((p: any) => p.user_id !== userId);
				let opponentsLabel: string;
				if (others.length === 0) {
						opponentsLabel = 'Local Player';
				} else if (others.length === 1) {
						opponentsLabel = others[0].username;
				} else if (others.length <= 3) {
						opponentsLabel = others.map((o: any) => o.username).join(', ');
				} else {
						opponentsLabel = others.slice(0, 3).map((o: any) => o.username).join(', ') + ` +${others.length - 3}`;
				}

				const result = h.result;
				const badgeClass =
						result === 'win'
								? 'bg-[#0bda8e]'
								: result === 'loss'
										? 'bg-[#D22B2B]'
										: 'bg-[#bfa626]';

				let scoreDisplay: string;
				if (others.length === 1) {
						const myScore = h.score;
						const opponent = others[0];
						scoreDisplay = `${myScore} - ${opponent.score}`;
				} else {
						scoreDisplay = `${h.score}`;
				}

				return `
				<tr>
						<td class="px-4 py-3 text-[#b99da6]">${formatDate(h.match.created_at)}</td>
						<td class="px-4 py-3 text-white">${opponentsLabel}</td>
						<td class="px-4 py-3">
								<span class="inline-block rounded-full ${badgeClass} px-4 py-1 text-white capitalize">
										${result}
								</span>
						</td>
						<td class="px-4 py-3 text-[#b99da6]">${scoreDisplay}</td>
				</tr>`;
		}).join('');

		tbody.innerHTML = rowsHtml;
}

function drawStatsChart(stats: any) {
		const canvas = document.getElementById('statsChart') as HTMLCanvasElement | null
		if (!canvas) return
		// ensure consistent small size
		canvas.width = 96
		canvas.height = 96
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const wins = stats.wins ?? 0
		const losses = stats.losses ?? 0
		const draws = stats.draws ?? 0
		const total = wins + losses + draws || 1

		const segments = [
				{ value: wins, color: '#0bda8e' },
				{ value: losses, color: '#D22B2B' },
				{ value: draws, color: '#bfa626' }
		]

		let start = -Math.PI / 2
		const cx = canvas.width / 2
		const cy = canvas.height / 2
		const r = (Math.min(cx, cy) - 2)

		ctx.clearRect(0, 0, canvas.width, canvas.height)

		segments.forEach(seg => {
				if (seg.value <= 0) return
				const angle = (seg.value / total) * Math.PI * 2
				ctx.beginPath()
				ctx.moveTo(cx, cy)
				ctx.arc(cx, cy, r, start, start + angle)
				ctx.closePath()
				ctx.fillStyle = seg.color
				ctx.fill()
				start += angle
		})

		// hole
		ctx.beginPath()
		ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2)
		ctx.fillStyle = '#181113'
		ctx.fill()

		const winRate = total ? Math.round((wins / total) * 100) : 0
		ctx.fillStyle = '#ffffff'
		ctx.font = 'bold 14px system-ui'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(`${winRate}%`, cx, cy)
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

document.addEventListener('friends-changed', onFriendsChanged, { once: true });

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
