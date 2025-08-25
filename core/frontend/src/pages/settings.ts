// frontend/src/pages/settings.ts
import { router } from '../main';
import type { PageModule } from '../router';
import { getSession, clearSession } from '../services/session';
import { showMsg } from '../utils/showMsg';
import { token as CSRFToken } from '../services/session';

const SettingsPage: PageModule & { renderWithParams?: Function } = {
	render(root) {
		root.innerHTML = '<p>Loading settings...</p>'
	},

	async renderWithParams(root, params) {
		root.innerHTML = '<p>Loading settings...</p>'

		const me = await getSession()
		if (!me) { router.go('/login'); return }

		if (!params.id || params.id !== String(me.id)) {
			root.innerHTML = `<p>You are not allowed to edit this user's settings.</p>`
			return
		}

		const res = await fetch(`/api/users/${me.id}`, {
			method: 'GET',
			credentials: 'include',
		})
		if (!res.ok) { root.innerHTML = '<p>User not found</p>'; return }
		const user = await res.json()

		root.innerHTML = /*html*/`
		<div class="min-h-screen w-full flex flex-col items-center justify-center bg-[#221116] space-y-8 py-8">

			<!-- Avatar upload section -->
			<section class="w-full max-w-[400px] p-8 shadow-md rounded-[25px] bg-[#2b171e] flex flex-col items-center space-y-4">
				<h2 class="text-center text-white text-xl font-bold mb-2">Change Avatar</h2>

				<div id="avatar-wrapper" class="relative group h-20 w-20 rounded-full overflow-hidden cursor-pointer">
					<img id="avatar-preview" src="${user.avatar}" alt="avatar"
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
					Upload
				</button>

				<span id="avatar-upload-msg" class="form-msg"></span>
			</section>

			<!-- Profile update form -->
			<form id="settings-form" class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
				<h2 class="text-center text-white text-2xl font-bold">Update Profile</h2>

				<label class="block">
					<span class="text-sm font-medium text-[#b99da6]">Username</span>
					<input name="username" type="text" placeholder="Username (for login)" value="${user.username ?? ''}"
						   class="mt-1 w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<label class="block">
					<span class="text-sm font-medium text-[#b99da6]">Nickname</span>
					<input name="nickname" type="text" placeholder="Nickname (public)" value="${user.nickname ?? ''}"
						   class="mt-1 w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<label class="block">
					<span class="text-sm font-medium text-[#b99da6]">Email</span>
					<input name="email" type="email" placeholder="Email" value="${user.email ?? ''}"
						   class="mt-1 w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide
						hover:bg-[#d41d59] active:bg-[#b31648] cursor-pointer" type="submit">
					Update
				</button>

				<p id="msg" class="form-msg"></p>
			</form>

			<!-- Password update form -->
			<form id="password-form" class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e] ${user.is_oauth ? 'hidden' : ''}">
				<h2 class="text-center text-white text-2xl font-bold">Change Password</h2>

				<label class="block">
						<input name="currentPassword" type="password" placeholder="Current Password"
										class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<label class="block">
					<input name="password" type="password" placeholder="New Password"
						   class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<label class="block">
					<input name="password_confirm" type="password" placeholder="Confirm New Password"
						   class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide
					hover:bg-[#d41d59] active:bg-[#b31648] cursor-pointer" type="submit">
					Change
				</button>

				<p id="password-msg" class="form-msg"></p>
			</form>

			<!-- 2FA Section -->
			<section class="w-full max-w-[400px] p-8 shadow-md rounded-[25px] bg-[#2b171e] space-y-4">
				<h2 class="text-center text-white text-xl font-bold mb-4">Two-Factor Authentication</h2>

				<div id="twofa-status" class="text-center">
					<p class="text-[#b99da6] mb-4">Loading 2FA status...</p>
				</div>

				<!-- 2FA Setup Section (hidden by default) -->
				<div id="twofa-setup" class="hidden space-y-4">
					<div class="text-center">
						<p class="text-[#b99da6] text-sm mb-4">
							Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
						</p>
						<div id="qr-container" class="flex justify-center mb-4">
							<!-- QR code will be inserted here -->
						</div>
						<div class="mb-4">
							<p class="text-[#b99da6] text-xs mb-2">Or enter this secret manually:</p>
							<div class="bg-[#48232f] p-3 rounded-lg">
								<code id="secret-text" class="text-white text-sm break-all"></code>
							</div>
						</div>
					</div>

					<label class="block">
						<input id="verification-code" type="text" placeholder="Enter 6-digit code from your app"
								 class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none"
								 maxlength="6" />
					</label>

					<button id="verify-2fa-btn"
							class="w-full h-10 rounded-xl bg-green-800 text-white font-bold tracking-wide
									 hover:bg-green-700 active:bg-green-600 cursor-pointer"
							type="button">
						Enable 2FA
					</button>

					<button id="cancel-2fa-btn"
							class="w-full h-10 rounded-xl bg-gray-600 text-white font-bold tracking-wide
									 hover:bg-gray-500 active:bg-gray-400 cursor-pointer"
							type="button">
						Cancel
					</button>

					<p id="twofa-setup-msg" class="form-msg"></p>
				</div>

				<!-- 2FA Controls (shown when 2FA status is loaded) -->
				<div id="twofa-controls" class="hidden space-y-4">
					<button id="enable-2fa-btn"
							class="w-full h-10 rounded-xl bg-green-800 text-white font-bold tracking-wide
									 hover:bg-green-700 active:bg-green-600 hidden cursor-pointer"
							type="button">
						Enable 2FA
					</button>

					<button id="disable-2fa-btn"
							class="w-full h-10 rounded-xl bg-red-800 text-white font-bold tracking-wide
									 hover:bg-red-700 active:bg-red-600 hidden cursor-pointer"
							type="button">
						Disable 2FA
					</button>

					<p id="twofa-msg" class="form-msg"></p>
				</div>
			</section>

			<!-- Account & Data Management -->
			<section class="w-full max-w-[400px] p-8 shadow-md rounded-[25px] bg-[#2b171e] space-y-4">
				<h2 class="text-center text-white text-xl font-bold mb-4">Account & Data</h2>

				<button id="delete-account-btn"
					class="w-full h-10 rounded-xl bg-red-800 text-white font-bold tracking-wide
						hover:bg-red-700 active:bg-red-600 cursor-pointer"
					type="button">
					Delete Account
				</button>

				<button id="anonymize-data-btn"
					class="w-full h-10 rounded-xl bg-[#824155] text-white font-bold tracking-wide
						hover:bg-[#6c3543] active:bg-[#582a36] cursor-pointer"
					type="button">
					Anonymize Data
				</button>

				<div class="space-y-3">
						<label class="block">
								<span class="text-sm font-medium text-[#b99da6]">Export Format</span>
								<select id="export-format"
										class="mt-1 w-full h-10 rounded-xl bg-[#48232f] px-3 text-white focus:outline-none">
										<option value="json">JSON (.json)</option>
										<option value="json.gz">Compressed JSON (.json.gz)</option>
										<option value="zip">ZIP (.zip)</option>
								</select>
						</label>
						<label class="flex items-center space-x-2 text-[#b99da6] text-sm">
								<input id="export-include-media" type="checkbox" class="h-4 w-4" disabled />
								<span>Include media (only for ZIP)</span>
						</label>
				</div>

				<button id="export-data-btn"
					class="w-full h-10 rounded-xl bg-gray-600 text-white font-bold tracking-wide
						hover:bg-gray-500 active:bg-gray-400 cursor-pointer"
					type="button">
					Export Data
				</button>

				<p id="account-msg" class="form-msg"></p>
			</section>
		</div>
	`

		const wrapper = root.querySelector('#avatar-wrapper') as HTMLDivElement
		const avatarInput = root.querySelector('#avatar-input') as HTMLInputElement
		const avatarPreview	= root.querySelector('#avatar-preview') as HTMLImageElement
		const avatarMsg	= root.querySelector('#avatar-upload-msg') as HTMLSpanElement
		const avatarBtn	= root.querySelector('#avatar-upload-btn') as HTMLButtonElement
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
				// const uploadResponse = await fetch(`/api/users/${me.id}/avatar`, { method: 'POST', body: fd })
				const headers = new Headers({ 'Content-Type': 'application/json' });
				if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
				const uploadResponse = await fetch('/api/me/avatar', {
					method: 'POST',
					credentials: 'include',
					headers,
					body: fd,
				});
				if (uploadResponse.ok) {
					const userResponse = await fetch(`/api/users/${me.id}`, {
						method: 'GET',
						credentials: 'include',
					});
					const updatedUser = await userResponse.json();
					avatarPreview.src = updatedUser.avatar + `?t=${Date.now()}`;
					showMsg(avatarMsg, 'Avatar updated!', true)
					document.dispatchEvent(new Event('settings-update'))
				} else {
					const { error } = await uploadResponse.json()
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

			const formData = new FormData(settingsForm)
			const data: Record<string, any> = {}

			// Only include fields that have changed from the initial user data
			if (formData.get('username') !== user.username) data.username = formData.get('username')
			if (formData.get('nickname') !== user.nickname) data.nickname = formData.get('nickname')
			if (formData.get('email') !== user.email) data.email = formData.get('email')

			if (Object.keys(data).length === 0) {
				showMsg(errorMsg, 'No changes to update.', true)
				return
			}

			try {
				const headers = new Headers({ 'Content-Type': 'application/json' });
				if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
				const r = await fetch(`/api/me`, {
					method: 'PATCH',
					credentials: 'include',
					headers,
					body: JSON.stringify(data)
				})
				if (r.ok) {
					showMsg(errorMsg, 'Profile updated!', true)
					document.dispatchEvent(new Event('settings-update'))
					// Update user object to reflect changes
					Object.assign(user, data)
				} else {
					const { error } = await r.json()
					showMsg(errorMsg, error || 'Update failed')
				}
			} catch {
				showMsg(errorMsg, 'Network error')
			}
		}

		// Password form logic
		const passwordForm = root.querySelector<HTMLFormElement>('#password-form')!
		const passwordMsg = root.querySelector<HTMLParagraphElement>('#password-msg')!
		passwordForm.onsubmit = async e => {
			e.preventDefault()
			showMsg(passwordMsg, '')


			const formEntries = new FormData(passwordForm)
			const data: any = Object.fromEntries(formEntries)

			if (!data.currentPassword) {
				showMsg(passwordMsg, 'Current password is required.')
				return
			}
			if (!data.password) {
				showMsg(passwordMsg, 'New password cannot be empty.')
				return
			}
			if (data.password !== data.password_confirm) {
				showMsg(passwordMsg, 'Passwords do not match.')
				return
			}

			try {
				const headers = new Headers({ 'Content-Type': 'application/json' });
				if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
				const r = await fetch(`/api/me`, {
					method: 'PATCH',
					credentials: 'include',
					headers,
					body: JSON.stringify({ password: data.password, currentPassword: data.currentPassword })
				})
				if (r.ok) {
					showMsg(passwordMsg, 'Password changed successfully!', true)
					passwordForm.reset()
				} else {
					const { error } = await r.json().catch(() => ({ error: 'Update failed' }))
					showMsg(passwordMsg, error || 'Update failed')
				}
			} catch {
				showMsg(passwordMsg, 'Network error')
			}
		}

		// 2FA Logic
		const twofaStatus = root.querySelector('#twofa-status') as HTMLDivElement
		const twofaSetup = root.querySelector('#twofa-setup') as HTMLDivElement
		const twofaControls = root.querySelector('#twofa-controls') as HTMLDivElement
		const qrContainer = root.querySelector('#qr-container') as HTMLDivElement
		const secretText = root.querySelector('#secret-text') as HTMLElement
		const verificationCode = root.querySelector('#verification-code') as HTMLInputElement
		const verifyBtn = root.querySelector('#verify-2fa-btn') as HTMLButtonElement
		const cancelBtn = root.querySelector('#cancel-2fa-btn') as HTMLButtonElement
		const enableBtn = root.querySelector('#enable-2fa-btn') as HTMLButtonElement
		const disableBtn = root.querySelector('#disable-2fa-btn') as HTMLButtonElement
		const twofaSetupMsg = root.querySelector('#twofa-setup-msg') as HTMLParagraphElement
		const twofaMsg = root.querySelector('#twofa-msg') as HTMLParagraphElement

		let currentSecret = ''

		// Check current 2FA status
		const check2FAStatus = async () => {
			try {
				const statusRes = await fetch('/api/2fa/status', {
					method: 'GET',
					credentials: 'include'
				})

				if (!statusRes.ok) {
					throw new Error('Failed to get 2FA status')
				}

				const { enabled } = await statusRes.json()

				twofaStatus.innerHTML = `
					<p class="text-${enabled ? 'green' : 'gray'}-400 mb-4">
						2FA is currently <strong>${enabled ? 'enabled' : 'disabled'}</strong>
					</p>
				`

				if (enabled) {
					disableBtn.classList.remove('hidden')
					enableBtn.classList.add('hidden')
				} else {
					enableBtn.classList.remove('hidden')
					disableBtn.classList.add('hidden')
				}

				twofaControls.classList.remove('hidden')
			} catch (error) {
				console.error('2FA status check error:', error)
				twofaStatus.innerHTML = '<p class="text-red-400">Failed to load 2FA status</p>'
			}
		}

		// Generate QR code and secret
		const generate2FA = async () => {
			try {
				showMsg(twofaSetupMsg, 'Generating QR code...')

				const headers = new Headers({ 'Content-Type': 'application/json' });
				if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
				const res = await fetch('/api/2fa/generate', {
					method: 'POST',
					credentials: 'include',
					headers,
				})

				if (!res.ok) {
					const error = await res.json()
					throw new Error(error.error || 'Failed to generate 2FA')
				}

				const { qr, secret } = await res.json()

				// Display QR code
				qrContainer.innerHTML = `<img src="${qr}" alt="2FA QR Code" class="max-w-full h-auto" />`

				// Use the secret from the API response for manual entry
				if (secret) {
					currentSecret = secret
					secretText.textContent = currentSecret
				}

				showMsg(twofaSetupMsg, '')
				twofaSetup.classList.remove('hidden')
				twofaControls.classList.add('hidden')
			} catch (error) {
				showMsg(twofaSetupMsg, (error as Error).message)
			}
		}

		// Verify and enable 2FA
		const verify2FA = async () => {
			const code = verificationCode.value.trim()
			if (!code || code.length !== 6) {
				showMsg(twofaSetupMsg, 'Please enter a valid 6-digit code')
				return
			}

			try {
				verifyBtn.disabled = true
				showMsg(twofaSetupMsg, 'Verifying code...')

				const headers = new Headers({ 'Content-Type': 'application/json' });
				if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
				const res = await fetch('/api/2fa/verify', {
					method: 'POST',
					headers,
					credentials: 'include',
					body: JSON.stringify({ token: code })
				})

				if (!res.ok) {
					const error = await res.json()
					throw new Error(error.error || 'Verification failed')
				}

				showMsg(twofaSetupMsg, '2FA enabled successfully!', true)

				// Hide setup, show controls
				setTimeout(() => {
					twofaSetup.classList.add('hidden')
					verificationCode.value = ''
					qrContainer.innerHTML = ''
					secretText.textContent = ''
					currentSecret = ''
					check2FAStatus()
				}, 2000)

			} catch (error) {
				showMsg(twofaSetupMsg, (error as Error).message)
			} finally {
				verifyBtn.disabled = false
			}
		}

		// Cancel 2FA setup
		const cancel2FA = () => {
			twofaSetup.classList.add('hidden')
			twofaControls.classList.remove('hidden')
			verificationCode.value = ''
			qrContainer.innerHTML = ''
			secretText.textContent = ''
			currentSecret = ''
			showMsg(twofaSetupMsg, '')
		}

		// Disable 2FA
		const disable2FA = async () => {
			if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
				return
			}

			try {
				disableBtn.disabled = true
				showMsg(twofaMsg, 'Disabling 2FA...')

				const headers = new Headers({ 'Content-Type': 'application/json' });
				if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
				const res = await fetch('/api/2fa/disable', {
					method: 'POST',
					credentials: 'include',
					headers,
				})

				if (!res.ok) {
					const error = await res.json()
					throw new Error(error.error || 'Failed to disable 2FA')
				}

				showMsg(twofaMsg, '2FA disabled successfully!', true)
				check2FAStatus()

			} catch (error) {
				showMsg(twofaMsg, (error as Error).message)
			} finally {
				disableBtn.disabled = false
			}
		}

		// Event listeners
		enableBtn.onclick = generate2FA
		verifyBtn.onclick = verify2FA
		cancelBtn.onclick = cancel2FA
		disableBtn.onclick = disable2FA

		// Allow Enter key to verify code
		verificationCode.onkeydown = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				verify2FA()
			}
		}

		// Only allow numbers in verification code
		verificationCode.oninput = (e) => {
			const input = e.target as HTMLInputElement
			input.value = input.value.replace(/[^0-9]/g, '')
		}

		// Initialize 2FA status check
		check2FAStatus()

		// Account & Data buttons
		const deleteBtn = root.querySelector('#delete-account-btn') as HTMLButtonElement
		const anonymizeBtn = root.querySelector('#anonymize-data-btn') as HTMLButtonElement
		const exportBtn = root.querySelector('#export-data-btn') as HTMLButtonElement
		const accountMsg = root.querySelector('#account-msg') as HTMLParagraphElement
		const formatSelect = root.querySelector('#export-format') as HTMLSelectElement
		const includeMediaCheckbox = root.querySelector('#export-include-media') as HTMLInputElement

		anonymizeBtn.onclick = async () => {
			if (!confirm('Anonymize your personal data? This action cannot be undone.')) return
			showMsg(accountMsg, 'Processing...')
			try {
				const headers = new Headers({ 'Content-Type': 'application/json' });
				if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
				const r = await fetch('/api/me/anonymize', {
					method: 'POST',
					credentials: 'include',
					headers,
				})
				if (r.ok) {
					showMsg(accountMsg, 'Data anonymized.', true)
					document.dispatchEvent(new Event('settings-update'))
				} else {
					const { error } = await r.json().catch(() => ({ error: 'Failed' }))
					showMsg(accountMsg, error || 'Failed')
				}
			} catch {
				showMsg(accountMsg, 'Network error')
			}
		}

	deleteBtn.onclick = async () => {
		if (!confirm('Delete your account permanently? This cannot be undone.')) return
		const confirmText = prompt('Type DELETE to confirm permanent deletion of your account:')
		if (confirmText !== 'DELETE') {
			showMsg(accountMsg, 'Deletion cancelled')
			return
		}
		showMsg(accountMsg, 'Deleting account...')
		try {
			const headers = new Headers();
			if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
			const r = await fetch('/api/me', {
				method: 'DELETE',
				credentials: 'include',
				headers
			})
		if (r.ok) {
			showMsg(accountMsg, 'Account deleted. Redirecting...', true)
			clearSession()
			document.dispatchEvent(new Event('auth-change'))
			setTimeout(() => {
				router.go('/login')
			}, 1200)
		} else {
			const { error } = await r.json().catch(() => ({ error: 'Delete failed' }))
			showMsg(accountMsg, error || 'Delete failed')
		}
		} catch {
			showMsg(accountMsg, 'Network error')
		}
	}

        const syncMediaCheckbox = () => {
            if (formatSelect.value === 'zip') {
                includeMediaCheckbox.disabled = false
            } else {
                includeMediaCheckbox.checked = false
                includeMediaCheckbox.disabled = true
            }
        }
        formatSelect.onchange = syncMediaCheckbox
        syncMediaCheckbox()

        exportBtn.onclick = async () => {
            showMsg(accountMsg, 'Preparing export...')
            const format = formatSelect.value
            const includeMedia = includeMediaCheckbox.checked
            let url = `/api/me/export?format=${encodeURIComponent(format)}`
            if (format === 'zip' && includeMedia) {
                url += '&includeMedia=true'
            }
            try {
                const r = await fetch(url, { method: 'GET', credentials: 'include' })
                if (!r.ok) {
                    const { error } = await r.json().catch(() => ({ error: 'Export failed' }))
                    showMsg(accountMsg, error || 'Export failed')
                    return
                }
                const blob = await r.blob()
                let filename = 'export.' + (format === 'json' ? 'json' : format === 'json.gz' ? 'json.gz' : 'zip')
                const cd = r.headers.get('Content-Disposition')
                if (cd) {
                    const m = cd.match(/filename="?([^"]+)"?/)
                    if (m) filename = m[1]
                }
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = filename
                document.body.appendChild(a)
                a.click()
                setTimeout(() => {
                    URL.revokeObjectURL(a.href)
                    a.remove()
                }, 0)
                showMsg(accountMsg, 'Export downloaded.', true)
            } catch {
                showMsg(accountMsg, 'Network error')
            }
        }

        const pwForm = root.querySelector('#password-form')
        if (pwForm && user.is_oauth === 1) {
            pwForm.classList.add('hidden')
        }
	}
}

export default SettingsPage
