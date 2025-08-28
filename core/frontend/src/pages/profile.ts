import type { PageModule } from '../router';
import type { ApiUser } from '../types/types';
// import { getSession } from '../services/auth'
import { router } from '../main';
import { isFriend } from '../utils/isFriend';
import { updateDot } from '../utils/statusDot';
import { token as CSRFToken, getSession } from '../services/session';
import { wsEvents } from '../services/websocket';

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

<!-- Filter above stats -->
<div class="px-4 flex items-center justify-end">
<label class="text-sm text-[#b99da6] flex items-center gap-2">
<span>Filter (Mode):</span>
<select id="modeFilter" class="bg-[#271c1f] border border-[#543b43] rounded px-2 py-1 text-white text-sm">
<option value="all">All</option>
</select>
</label>
</div>

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
<div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between px-4">
<h2 class="text-xl font-bold text-white">Match History</h2>
</div>
<div class="mx-4 overflow-x-auto rounded-xl border border-[#543b43] bg-[#181113]">
<table class="min-w-[480px] w-full text-left">
<thead class="bg-[#271c1f] text-white">
<tr>
<th class="px-4 py-3">Date</th>
<th class="px-4 py-3">Opponent</th>
<th class="px-4 py-3">Result</th>
<th class="px-4 py-3">Health</th>
<th class="px-4 py-3">Mode</th>
<th class="px-4 py-3">Duration</th>
</tr>
</thead>
<tbody id="matchHistoryBody" class="divide-y divide-[#543b43]">
<tr><td colspan="6" class="px-4 py-4 text-center text-[#b99da6]">Loading...</td></tr>
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
		`/${user.avatar}`

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
	// const { friendId, online } = (ev as CustomEvent<FriendStatusMsg>).detail
	// if (friendId === user.id) updateDot(friendId, online);
	// }

	// // attach when the profile is shown
	// presence.addEventListener('friend-status', onStatus);

	// // detach when the route is left
	// (root as any).onDestroy = () => {
	// presence.removeEventListener('friend-status', onStatus)
	// }

	// TESTING USER STATS AND MACHES
	const stats = await fetchUserStats(user.id);
	if (stats) {
		renderStats(stats);
	}
	let history = await fetchMatchHistory(user.id);
	(root as any)._fullHistory = history; // cache
	initModeFilter(history, user.id, root);
	await renderMatchHistory(history, user.id);
	// draw chart after stats
	if (stats) drawStatsChart(stats);

	// Live update profile if this user is updated elsewhere
	const onUserUpdated = async (ev: Event) => {
		const { user: updated } = (ev as CustomEvent).detail || {}
		if (!updated || updated.id !== user.id) return
		try {
			const res = await fetch(`/api/users/${user.id}`)
			if (!res.ok) return
			const fresh = await res.json()
			const nameEl = root.querySelector<HTMLHeadingElement>('#profileName')
			const handleEl = root.querySelector<HTMLParagraphElement>('#profileHandle')
			const avatarEl = root.querySelector<HTMLImageElement>('#profileAvatar')
			if (nameEl) nameEl.textContent = fresh.nickname
			if (handleEl) handleEl.textContent = '@' + fresh.username.toLowerCase().replace(/\s+/g, '_')
			if (avatarEl) avatarEl.src = fresh.avatar + `?t=${Date.now()}`
		} catch { /* ignore */ }
	}
	wsEvents.addEventListener('user_updated', onUserUpdated)

		; (root as any).onDestroy = () => {
			wsEvents.removeEventListener('user_updated', onUserUpdated)
		}
}

// Helper function for stats
async function fetchUserStats(userId: number) {
	try {
		const me = await getSession();
		const path = me?.id === userId
			? '/api/me/stats'
			: `/api/users/${userId}/stats`;
		const res = await fetch(path, {
			method: 'GET',
			credentials: 'include',
		});
		if (!res.ok) throw new Error(`stats ${res.status}`);
		return await res.json();
	} catch (err) {
		console.log('Failed to load stats:', err);
		return null; // Or fallback data
	}
}

function renderStats(stats: { totalGames: number; wins: number; losses: number; draws: number }) {
	const totalEl = document.getElementById('statTotal')
	const winsEl = document.getElementById('statWins')
	const lossesEl = document.getElementById('statLosses')
	const drawsEl = document.getElementById('statDraws')
	if (totalEl) totalEl.textContent = String(stats.totalGames)
	if (winsEl) winsEl.textContent = String(stats.wins)
	if (lossesEl) lossesEl.textContent = String(stats.losses)
	if (drawsEl) drawsEl.textContent = String(stats.draws)
}

// Helper function for history
async function fetchMatchHistory(userId: number) {
	try {
		const me = await getSession();
		const path = me?.id === userId
			? '/api/me/matches'
			: `/api/users/${userId}/matches`;
		const res = await fetch(path, {
			method: 'GET',
			credentials: 'include',
		});
		if (!res.ok) throw new Error(`matches ${res.status}`);
		return await res.json();
	} catch (err) {
		console.log('Failed to load history:', err);
		return []; // Empty array as fallback
	}
}

async function fetchMatchParticipants(matchId: number) {
	try {
		const res = await fetch(`/api/matches/${matchId}/participants`, {
			method: 'GET',
			credentials: 'include',
		});
		if (!res.ok) throw new Error(`participants ${res.status}`);
		return await res.json(); // always return data
	} catch (err) {
		console.log('Failed to load participants for match', matchId, err);
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
		tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-4 text-center text-[#b99da6]">No matches yet</td></tr>`;
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

		const modeDisplay = lobbyTypeName(h.match.mode);
		const durationDisplay = formatDuration(h.match.duration);

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
<td class="px-4 py-3 text-[#b99da6]">${modeDisplay}</td>
<td class="px-4 py-3 text-[#b99da6]">${durationDisplay}</td>
</tr>`;
	}).join('');

	tbody.innerHTML = rowsHtml;
}

function drawStatsChart(stats: { wins: number; losses: number; draws: number }) {
	const canvas = document.getElementById('statsChart') as HTMLCanvasElement | null
	if (!canvas) return
	const ctx = canvas.getContext('2d')
	if (!ctx) return

	// Clear
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	const values = [stats.wins, stats.losses, stats.draws]
	const colors = ['#0bda8e', '#D22B2B', '#bfa626']
	const total = values.reduce((a, b) => a + b, 0)
	const wins = stats.wins

	const cx = canvas.width / 2
	const cy = canvas.height / 2
	const rOuter = 42
	const rInner = 28

	// If nothing to draw, just render a subtle ring
	if (total === 0) {
		// Subtle ring
		ctx.beginPath()
		ctx.arc(cx, cy, rOuter, 0, Math.PI * 2)
		ctx.strokeStyle = '#3a2b2f'
		ctx.lineWidth = 12
		ctx.stroke()

		// Center label (0%)
		const winRate = 0
		ctx.fillStyle = '#ffffff'
		ctx.font = 'bold 14px system-ui'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(`${winRate}%`, cx, cy)
		return
	}

	// Donut segments
	let start = -Math.PI / 2
	for (let i = 0; i < values.length; i++) {
		const angle = (values[i] / total) * Math.PI * 2
		const end = start + angle
		ctx.beginPath()
		ctx.moveTo(cx, cy)
		ctx.arc(cx, cy, rOuter, start, end)
		ctx.closePath()
		ctx.fillStyle = colors[i]
		ctx.fill()
		start = end
	}

	// Punch inner hole
	ctx.globalCompositeOperation = 'destination-out'
	ctx.beginPath()
	ctx.arc(cx, cy, rInner, 0, Math.PI * 2)
	ctx.fill()
	ctx.globalCompositeOperation = 'source-over'

	// Center win rate label (respects filter because stats are filtered)
	const winRate = Math.round((wins / total) * 100)
	ctx.fillStyle = '#ffffff'
	ctx.font = 'bold 14px system-ui'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillText(`${winRate}%`, cx, cy)
}

// Utilities to compute and apply filtered stats
function computeStatsFromHistory(history: any[]) {
	let wins = 0, losses = 0, draws = 0
	for (const h of history) {
		if (h.result === 'win') wins++
		else if (h.result === 'loss') losses++
		else if (h.result === 'draw') draws++
	}
	return {
		totalGames: history.length,
		wins, losses, draws
	}
}

function updateStatsForHistory(history: any[], _root: HTMLElement) {
	const stats = computeStatsFromHistory(history)
	renderStats(stats)
	drawStatsChart(stats)
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
		const r = await fetch(`/api/users/${id}`, {
			method: 'GET',
			credentials: 'include',
		});
		const obj = (await r.json()) as ApiUser;
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
			// const res = await fetch(`/api/users/${params.id}`)
			const res = await fetch(`/api/users/${params.id}`, {
				method: 'GET',
				credentials: 'include',
			});
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


function formatDuration(raw: number) {
	// raw already in seconds (float). Show mm:ss or s.ms if < 60
	if (raw == null || isNaN(raw)) return '-';
	if (raw < 60) {
		return `${raw.toFixed(2)}s`;
	}
	const totalSeconds = Math.floor(raw);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const LobbyTypeNames: Record<number, string> = {
	1: 'Matchmaking',
	2: 'Custom',
	3: 'Tournament',
	4: 'Tournament Game'
};

function lobbyTypeName(mode: number): string {
	return LobbyTypeNames[mode] ?? `Mode ${mode}`;
}

function initModeFilter(history: any[], userId: number, root: HTMLElement) {
	const select = root.querySelector<HTMLSelectElement>('#modeFilter');
	if (!select) return;

	// Fill options from unique modes
	const modes = Array.from(new Set(history.map(h => h.match.mode))).sort((a, b) => a - b);
	const frag = document.createDocumentFragment();
	for (const m of modes) {
		const opt = document.createElement('option');
		opt.value = String(m);
		opt.textContent = lobbyTypeName(m);
		frag.appendChild(opt);
	}
	select.appendChild(frag);

	// Handle changes: update stats and table
	select.addEventListener('change', async () => {
		const full = (root as any)._fullHistory as any[] || [];
		const val = select.value;
		const filtered = val === 'all' ? full : full.filter(h => String(h.match.mode) === val);

		updateStatsForHistory(filtered, root);
		await renderMatchHistory(filtered, userId);
	});
}