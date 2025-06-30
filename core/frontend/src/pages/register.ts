// frontend/src/pages/register.ts
import type { PageModule } from '../router'

const RegisterPage: PageModule = {
	render (root) {
		root.innerHTML = `
		<div class="min-h-screen w-full flex items-center justify-center bg-[#221116]">
		<form id="signup" class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
			<h2 class="text-center text-white text-2xl font-bold">Create your account</h2>

			<label class="block">
			<input name="username"
					type="text"
					placeholder="Username"
					autocomplete="username"
					class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
							placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<label class="block">
			<input name="email"
					type="email"
					placeholder="E-mail"
					autocomplete="email"
					class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
							placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<label class="block">
			<input name="emailConfirm"
					type="email"
					placeholder="Confirm e-mail"
					autocomplete="email"
					class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
							placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<label class="block">
			<input name="password"
					type="password"
					placeholder="Password"
					autocomplete="new-password"
					class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
							placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide">
			Sign Up
			</button>

			<p id="msg" class="text-center text-sm text-[#ca91a3]"></p>

			<p class="text-center text-sm">
			<a href="/login" data-route class="text-[#ca91a3] underline hover:text-[#f22667]">
				Already have an account? Log in
			</a>
			</p>
		</form>
		</div>`
	},

	// after the DOM is rendered, attach events
	async afterRender (root) {
		const form = root.querySelector<HTMLFormElement>('#signup')!
		const msg  = root.querySelector<HTMLParagraphElement>('#msg')!

		form.addEventListener('submit', async (e) => {
		e.preventDefault()

		// collect fields
		const data = Object.fromEntries(new FormData(form)) as Record<string, string>

		// basic client-side checks
		if (data.email !== data.emailConfirm) {
			msg.textContent = 'E-mails do not match'
			return
		}

		try {
			const res = await fetch('/api/register', {
				method : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body : JSON.stringify({
					email: data.email.trim(),
					password: data.password,
					username: data.username.trim()
				})
			})

			if (res.ok) {
				const { userId } = await res.json()
				msg.textContent = `Account #${userId} created!`
				msg.classList.replace('text-[#ca91a3]', 'text-green-400')
				form.reset()
			} else {
				const { error } = await res.json()
				msg.textContent = error || `Error ${res.status}`
			}
			} catch (err) {
				msg.textContent = 'Network error'
				console.error(err)
			}
		})
	}
}

export default RegisterPage
