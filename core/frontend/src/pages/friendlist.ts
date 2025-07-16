import type { PageModule } from '../router'

type UserPreview = { id: number; username: string; avatar: string }

/* ---- fetch helper (only used when friends[] still contains IDs) ---- */
async function fetchUser(id: number): Promise<UserPreview> {
	const u = await fetch(`/api/users/${id}`).then(r => r.json())
	return { id: u.id, username: u.username, avatar: u.avatar }
}

const li = (u: UserPreview, right = '') => /*html*/`
<li class="bg-[#2b171e] rounded-xl p-5 sm:px-6 sm:py-5 text-lg text-white
		   flex flex-col sm:flex-row sm:items-center justify-between gap-5">
	<span class="font-medium truncate flex items-center gap-2">
		<img src="/avatars/${u.avatar}" class="h-6 w-6 rounded-full object-cover">
		${u.username}
	</span>
	${right}
</li>`

const empty = (txt: string) => `<p class="text-[#ca91a3]">${txt}</p>`

const FriendListPage: PageModule = {
	render(root) {
		root.innerHTML = /*html*/`
			<div class="min-h-screen bg-[#221116] flex flex-col items-center p-10 space-y-10">
				<h2 class="text-4xl text-white font-semibold">Friend list</h2>

				${['Pending', 'Accepted', 'Rejected'].map(s => /*html*/`
					<section class="w-full max-w-2xl space-y-4">
						<h3 class="text-xl text-white">${s}</h3>
						<ul id="${s.toLowerCase()}" class="space-y-4"></ul>
						<div id="${s.toLowerCase()}-empty">${empty('Loading…')}</div>
					</section>`).join('')}
			</div>`
	},

	async afterRender(root) {
		/* refs */
		const	$pending	= root.querySelector<HTMLUListElement>('#pending')!
		const	$accepted	= root.querySelector<HTMLUListElement>('#accepted')!
		const	$rejected	= root.querySelector<HTMLUListElement>('#rejected')!
		const	$pEmpty		= root.querySelector('#pending-empty')!
		const	$aEmpty		= root.querySelector('#accepted-empty')!
		const	$rEmpty		= root.querySelector('#rejected-empty')!

		/* current user */
		const me = await fetch('/api/me').then(r => r.json())

		/* data */
		const [reqs, friendsRaw] = await Promise.all([
			fetch(`/api/users/${me.id}/requests`).then(r => r.json()),
			fetch(`/api/users/${me.id}/friends`).then(r => r.json())
		])

		/* ---------- Accepted ---------- */
		const friendList = Array.isArray(friendsRaw.friends) ? friendsRaw.friends : []

		// detect format: array of numbers OR array of objects
		if (friendList.length && typeof friendList[0] === 'object') {
			// already full objects
			const users = friendList as UserPreview[]
			$accepted.innerHTML = users.map(u => li(u)).join('')
			$aEmpty.remove()
		} else if (friendList.length) {
			// numeric IDs → fetch full rows
			const users = await Promise.all((friendList as number[]).map(fetchUser))
			$accepted.innerHTML = users.map(u => li(u)).join('')
			$aEmpty.remove()
		} else {
			$aEmpty.textContent = 'No accepted friends'
		}

		/* ---------- Pending ---------- */
		const pendingRows = reqs.filter((r: any) => r.status === 'pending')
		if (pendingRows.length) {
			const users = await Promise.all(
				pendingRows.map((r: any) => fetchUser(r.requester_id))
			)
			$pending.innerHTML = users.map((u, i) => li(u, `
				<div class="flex gap-2">
					<button class="action px-3 py-1 rounded-md bg-[#0bda8e] hover:bg-[#0ac582]"
							data-id="${pendingRows[i].id}" data-act="accept">✓</button>
					<button class="action px-3 py-1 rounded-md bg-[#D22B2B] hover:bg-[#b91c1c]"
							data-id="${pendingRows[i].id}" data-act="reject">✗</button>
				</div>`)).join('')
			$pEmpty.remove()
		} else {
			$pEmpty.textContent = 'No pending requests'
		}

		/* ---------- Rejected ---------- */
		const rejectedRows = reqs.filter((r: any) => r.status === 'rejected')
		if (rejectedRows.length) {
			const users = await Promise.all(
				rejectedRows.map((r: any) => fetchUser(r.requester_id))
			)
			$rejected.innerHTML = users.map(u => li(u)).join('')
			$rEmpty.remove()
		} else {
			$rEmpty.textContent = 'No rejected requests'
		}

		/* ---------- Button handlers ---------- */
		root.querySelectorAll<HTMLButtonElement>('.action')
			.forEach(btn => btn.addEventListener('click', async () => {
				btn.disabled = true
				const ok = await fetch(
					`/api/requests/${btn.dataset.id}/${btn.dataset.act}`,
					{ method: 'POST' }
				).then(r => r.ok)

				ok ? btn.closest('li')?.remove() : (alert('Server error'), btn.disabled = false)
			}))
	}
}

export default FriendListPage
