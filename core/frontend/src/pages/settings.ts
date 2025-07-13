// frontend/src/pages/settings.ts
import type { PageModule } from '../router'
import { currentUser } from '../services/auth'
import { router } from '../main'
import { showMsg } from '../utils/showMsg'

const SettingsPage: PageModule & { renderWithParams?: Function } = {
	render(root) {
		root.innerHTML = '<p>Loading settings...</p>'
	},

	async renderWithParams(root, params) {
		root.innerHTML = '<p>Loading settings...</p>'

		const me = await currentUser()
		if (!me) { router.go('/login'); return }

		if (!params.id || params.id !== String(me.id)) {
			root.innerHTML = `<p>You are not allowed to edit this user's settings.</p>`
			return
		}

		const res = await fetch(`/api/users/${me.id}`)
		if (!res.ok) { root.innerHTML = '<p>User not found</p>'; return }
		const user = await res.json()

		root.innerHTML = /*html*/`
		<div class="min-h-screen w-full flex flex-col items-center justify-center bg-[#221116] space-y-12">

			<!-- Avatar upload section -->
			<section class="w-full max-w-[400px] p-8 shadow-md rounded-[25px] bg-[#2b171e] flex flex-col items-center space-y-4">
				<h2 class="text-center text-white text-xl font-bold mb-2">Change your avatar</h2>

				<div id="avatar-wrapper" class="relative group h-20 w-20 rounded-full overflow-hidden cursor-pointer">
					<img id="avatar-preview" src="/avatars/${user.avatar}" alt="avatar"
						 class="absolute inset-0 h-full w-full object-cover" />
					<div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center
								text-white text-xs font-semibold tracking-wide transition-colors duration-150 select-none">
						<span class="opacity-0 group-hover:opacity-100">Choose file</span>
					</div>
					<input id="avatar-input" type="file" accept="image/png,image/jpeg" class="hidden" />
				</div>

				<button id="avatar-upload-btn"
						class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide
							   hover:bg-[#d41d59] active:bg-[#b31648]"
						type="button" disabled>
					Upload Avatar
				</button>

				<span id="avatar-upload-msg" class="form-msg"></span>
			</section>

			<!-- Nickname update form -->
			<form id="settings-form" class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
				<h2 class="text-center text-white text-2xl font-bold">Update your nickname</h2>

				<label class="block">
					<input name="nickname" type="text" placeholder="Nickname (public)" value="${user.nickname ?? ''}"
						   class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide
							   hover:bg-[#d41d59] active:bg-[#b31648]" type="submit">
					Update Nickname
				</button>

				<p id="msg" class="form-msg"></p>
			</form>
		</div>
	`


		const wrapper		= root.querySelector('#avatar-wrapper') as HTMLDivElement
		const avatarInput	= root.querySelector('#avatar-input') as HTMLInputElement
		const avatarPreview	= root.querySelector('#avatar-preview') as HTMLImageElement
		const avatarMsg		= root.querySelector('#avatar-upload-msg') as HTMLSpanElement
		const avatarBtn		= root.querySelector('#avatar-upload-btn') as HTMLButtonElement
		let avatarFile: File | null = null

		// const showMsg = (el: HTMLElement, txt: string, ok = false) => {
		// 	el.textContent = txt
		// 	el.className = `form-msg ${ ok ? 'msg-ok' : 'msg-error' }`
		// }

		wrapper.onclick = () => avatarInput.click()

		avatarInput.onchange = () => {
			showMsg(avatarMsg, '')
			avatarFile = avatarInput.files?.[0] || null

			if (!avatarFile) { avatarBtn.disabled = true; return }
			if (avatarFile.size > 1 * 1024 * 1024) {
				showMsg(avatarMsg, 'File too large (max 1 MB)')
				avatarInput.value = ''
				avatarBtn.disabled = true
				avatarFile = null
				return
			}
			avatarBtn.disabled = false

			const reader = new FileReader()
			reader.onload = () => { avatarPreview.src = reader.result as string }
			reader.readAsDataURL(avatarFile)
		}

		avatarBtn.onclick = async () => {
			if (!avatarFile) return
			avatarBtn.disabled = true
			showMsg(avatarMsg, 'Uploading…')

			const fd = new FormData()
			fd.append('avatar', avatarFile)

			try {
				const r = await fetch(`/api/users/${me.id}/avatar`, { method: 'POST', body: fd })
				if (r.ok) {
					const { avatar } = await r.json()
					avatarPreview.src = `/avatars/${avatar}?t=${Date.now()}`
					showMsg(avatarMsg, 'Avatar updated!', true)
					document.dispatchEvent(new Event('settings-update'))
				} else {
					const { error } = await r.json()
					showMsg(avatarMsg, error || 'Upload failed')
				}
			} catch {
				showMsg(avatarMsg, 'Network error')
			} finally {
				avatarInput.value = ''
				avatarFile = null
				avatarBtn.disabled = true
			}
		}

		const settingsForm = root.querySelector<HTMLFormElement>('#settings-form')!
		const errorMsg = root.querySelector<HTMLParagraphElement>('#msg')!
		const nicknameInput = settingsForm.querySelector<HTMLInputElement>('input[name="nickname"]')!
		const submitBtn = settingsForm.querySelector<HTMLButtonElement>('button[type="submit"]')!

		// Function to toggle button state based on input
		const updateButtonState = () => {
			submitBtn.disabled = nicknameInput.value.trim() === ''
		}

		// Initial check
		updateButtonState()

		// Listen for changes
		nicknameInput.addEventListener('input', updateButtonState)

		settingsForm.onsubmit = async e => {
			e.preventDefault()
			showMsg(errorMsg, '')

			const data = Object.fromEntries(new FormData(settingsForm))
			Object.keys(data).forEach(k => { if (!data[k]) delete data[k] })

			if (!data.nickname) {
				showMsg(errorMsg, 'Nickname is required')
				return
			}

			try {
				const r = await fetch(`/api/users/${me.id}/nickname`, {
					method : 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body : JSON.stringify(data)
				})
				if (r.ok) {
					showMsg(errorMsg, 'Nickname updated!', true)
					document.dispatchEvent(new Event('settings-update'))
				} else {
					const { error } = await r.json()
					showMsg(errorMsg, error || 'Update failed')
				}
			} catch {
				showMsg(errorMsg, 'Network error')
			}
		}
	}
}

export default SettingsPage
