// frontend/src/pages/UsersPage.ts
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
    const list  = root.querySelector<HTMLUListElement>('#users-list')!;
    const empty = root.querySelector<HTMLParagraphElement>('#empty-msg')!;

    try {
      const res   = await fetch('/api/users');
      const users = res.ok ? await res.json() : null;

      if (users && users.length) {
        empty.remove();

		list.innerHTML = users
		.map((u: any) => `
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
				${u.display_name}
			  </a>
			</span>

			<span
			  class="text-[#ca91a3] break-all
					 sm:text-right sm:flex-shrink-0">
			  ${u.email}
			</span>
		  </li>
		`)
		.join('');


      } else {
        empty.textContent = 'No users currently';
      }
    } catch {
      empty.textContent = 'Error while loading users';
    }
  }
};

export default UsersPage;
