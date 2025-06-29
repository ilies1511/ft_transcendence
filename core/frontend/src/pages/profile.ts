// frontend/src/pages/profile.ts
import type { PageModule } from '../router';
import { currentUser } from '../services/auth'
import { router } from '../main'

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
        <span id="profileStatus" class="h-3 w-3 rounded-full bg-[#0bda8e]"></span>
      </div>
      <p id="profileHandle" class="text-[#b99da6]"></p>
    </div>
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

// const ProfilePage: PageModule = {
// 	render (root) { root.innerHTML = template },

// 	async afterRender (root) {
// 	  const user = await currentUser()             // GET /api/me  (cookie)
// 	//   if (!user) {                                 // 401 → not logged-in
// 	// 	router.go('/login')
// 	// 	return
// 	//   }

// 	  /* fill the placeholders */
// 	  root.querySelector<HTMLHeadingElement>('#profileName') !
// 	  .textContent = user.name
// 	root.querySelector<HTMLParagraphElement>('#profileHandle') !
// 	  .textContent = '@' + user.name.toLowerCase().replace(/\s+/g, '_')
// 	root.querySelector<HTMLImageElement>('#profileAvatar') !
// 	  .src = `/avatars/${user.avatar}`   // Now safe!
// 	}
//   }

async function renderProfile(root: HTMLElement, user: { id: number, name: string, avatar: string }) {
	root.innerHTML = template
	root.querySelector<HTMLHeadingElement>('#profileName') !
	  .textContent = user.name
	root.querySelector<HTMLParagraphElement>('#profileHandle') !
	  .textContent = '@' + user.name.toLowerCase().replace(/\s+/g, '_')
	root.querySelector<HTMLImageElement>('#profileAvatar') !
	  .src = `/avatars/${user.avatar}`
  }

  const ProfilePage: PageModule & { renderWithParams?: Function } = {
	render(root) {
	  root.innerHTML = `<p>Loading profile...</p>`
	},

	// Called for /profile/:id
	async renderWithParams(root: HTMLElement, params: { id?: string }) {
	  root.innerHTML = `<p>Loading profile...</p>`
	  if (params.id) {
		const res = await fetch(`/api/users/${params.id}`)
		if (!res.ok) {
		  root.innerHTML = `<p>User not found</p>`
		  return
		}
		const user = await res.json()
		await renderProfile(root, user)
	  } else {
		// fallback to current user if no id param
		const user = await currentUser()
		if (!user) {
		  router.go('/login')
		  return
		}
		await renderProfile(root, user)
	  }
	},

	// Called for /profile (current user)
	async afterRender(root: HTMLElement) {
	  const user = await currentUser()
	  if (!user) {
		router.go('/login')
		return
	  }
	  await renderProfile(root, user)
	}
  }

export default ProfilePage;
