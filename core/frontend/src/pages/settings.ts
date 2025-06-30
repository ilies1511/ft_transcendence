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

		if (!params.id || params.id !== String(me.id)) {
		root.innerHTML = `<p>You are not allowed to edit this user's settings.</p>`;
		return;
		}

		const res = await fetch(`/api/users/${me.id}`);
		if (!res.ok) {
		root.innerHTML = `<p>User not found</p>`;
		return;
		}
		const user = await res.json();

		// --- Render avatar upload section and settings form ---
		root.innerHTML = `
		<div class="min-h-screen w-full flex flex-col items-center justify-center bg-[#221116] space-y-12">

			<!-- Avatar upload section -->
			<section class="w-full max-w-[400px] p-8 shadow-md rounded-[25px] bg-[#2b171e] flex flex-col items-center space-y-4">
			<h2 class="text-center text-white text-xl font-bold mb-2">Change your avatar</h2>
			<img
				id="avatar-preview"
				src="/avatars/${user.avatar}"
				alt="avatar"
				class="h-20 w-20 rounded-full object-cover border-2 border-[#846543]"
			/>
			<input
				id="avatar-input"
				name="avatar"
				type="file"
				accept="image/png, image/jpeg"
				class="w-full h-10 rounded-xl bg-[#48232f] p-2 text-white"
			/>
			<button
				id="avatar-upload-btn"
				class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide"
				type="button"
				disabled
			>
				Upload Avatar
			</button>
			<span id="avatar-upload-msg" class="text-xs text-[#ca91a3]"></span>
			</section>

			<!-- Main settings form -->
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

		// --- Avatar upload logic ---
		const avatarInput = root.querySelector('#avatar-input') as HTMLInputElement;
		const avatarPreview = root.querySelector('#avatar-preview') as HTMLImageElement;
		const avatarMsg = root.querySelector('#avatar-upload-msg') as HTMLSpanElement;
		const avatarBtn = root.querySelector('#avatar-upload-btn') as HTMLButtonElement;
		let avatarFile: File | null = null;

		avatarInput?.addEventListener('change', () => {
		avatarMsg.textContent = '';
		if (!avatarInput.files || !avatarInput.files[0]) {
			avatarBtn.disabled = true;
			avatarFile = null;
			return;
		}
		avatarFile = avatarInput.files[0];

		if (avatarFile.size > 1 * 1024 * 1024) {
			avatarMsg.textContent = 'File too large (max 1MB)';
			avatarBtn.disabled = true;
			avatarInput.value = '';
			avatarFile = null;
			return;
		}

	avatarBtn.disabled = false;

	// Show preview before upload
	const reader = new FileReader();
	reader.onload = () => {
		avatarPreview.src = reader.result as string;
	};
		reader.readAsDataURL(avatarFile);
	});

	avatarBtn?.addEventListener('click', async () => {
	if (!avatarFile) return;
	avatarBtn.disabled = true;
	avatarMsg.textContent = 'Uploading...';

	const formData = new FormData();
	formData.append('avatar', avatarFile);

	try {
		const res = await fetch(`/api/users/${me.id}/avatar`, {
			method: 'POST',
			body: formData,
	});
	if (res.ok) {
		const result = await res.json();
		avatarPreview.src = `/avatars/${result.avatar}?t=${Date.now()}`; // bust cache
		avatarMsg.textContent = 'Avatar updated!';
	} else {
		const err = await res.json();
		avatarMsg.textContent = err.error || 'Upload failed';
	}
	} catch {
		avatarMsg.textContent = 'Network error';
	} finally {
		avatarBtn.disabled = false;
	}
});

	// --- Form submit logic ---
	const form = root.querySelector('#settings-form') as HTMLFormElement;
	const errorDiv = root.querySelector('#settings-error') as HTMLDivElement;

	form.onsubmit = async (e) => {
		e.preventDefault();
		errorDiv.textContent = '';
		const data = Object.fromEntries(new FormData(form).entries());

		// Remove empty fields and avatar (avatar is handled separately)
		Object.keys(data).forEach((k) => {
			if (!data[k] || k === 'avatar') delete data[k];
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
