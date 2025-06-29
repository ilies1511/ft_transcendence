import type { PageModule } from '../router';
import { currentUser } from '../services/auth';
import { router } from '../main';

const SettingsPage: PageModule & { renderWithParams?: Function } = {
  render(root) {
    root.innerHTML = `<p>Loading settings...</p>`;
  },

  async renderWithParams(root: HTMLElement, params: { id?: string }) {
    root.innerHTML = `<p>Loading settings...</p>`;

    // 1. Get the current logged-in user
    const me = await currentUser();
    if (!me) {
      router.go('/login');
      return;
    }

    // 2. Only allow user to edit their own settings
    if (!params.id || params.id !== String(me.id)) {
      root.innerHTML = `<p>You are not allowed to edit this user's settings.</p>`;
      return;
    }

    // 3. Fetch current user data (for pre-filling the form)
    // (You could also just use `me` if you trust your auth service)
    const res = await fetch(`/api/users/${me.id}`);
    if (!res.ok) {
      root.innerHTML = `<p>User not found</p>`;
      return;
    }
    const user = await res.json();

    // 4. Render the form with current data
	root.innerHTML = `
	<div class="min-h-screen w-full flex items-center justify-center bg-[#221116]">
		<form id="settings-form" class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
		<h2 class="text-center text-white text-2xl font-bold">Update your settings</h2>

		<label class="block">
			<input
			name="display_name"
			type="text"
			placeholder="Username"
			value="${user.name || ''}"
			autocomplete="username"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
					placeholder:text-[#ca91a3] focus:outline-none"
			/>
		</label>
			<label class="block">
			<input name="nickname" type="text" autocomplete="off"
					placeholder="Nickname (public)"
					value="${user.nickname ?? ''}"
					class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
							placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

		<label class="block">
			<input
			name="email"
			type="email"
			placeholder="E-mail"
			value="${user.email || ''}"
			autocomplete="email"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
					placeholder:text-[#ca91a3] focus:outline-none"
			/>
		</label>

		<label class="block">
			<input
			name="password"
			type="password"
			placeholder="New password"
			autocomplete="new-password"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
					placeholder:text-[#ca91a3] focus:outline-none"
			/>
		</label>

		<button
			class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide"
			type="submit"
		>
			Update
		</button>

		<p id="settings-error" class="text-center text-sm text-[#ca91a3]"></p>
		</form>
	</div>
	`;


    const form = root.querySelector('#settings-form') as HTMLFormElement;
    const errorDiv = root.querySelector('#settings-error') as HTMLDivElement;

    form.onsubmit = async (e) => {
      e.preventDefault();
      errorDiv.textContent = '';
      const data = Object.fromEntries(new FormData(form).entries());

      // Remove empty fields
      Object.keys(data).forEach((k) => {
        if (!data[k]) delete data[k];
      });

      try {
        const patchRes = await fetch(`/api/users/${me.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!patchRes.ok) {
          const err = await patchRes.json();
          errorDiv.textContent = err.error || 'Update failed';
        } else {
          errorDiv.textContent = 'Updated!';
        }
      } catch (err) {
        errorDiv.textContent = 'Network error';
      }
    };
  }
};

export default SettingsPage;
