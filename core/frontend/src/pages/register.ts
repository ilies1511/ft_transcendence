// // frontend/src/pages/register.ts
// import type { PageModule } from '../router'

// const template = /*html*/`
// 	<div class="w-full min-h-screen flex items-center justify-center bg-[#221116]">
// 		<form id="signup"
// 			class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
// 			<h2 class="text-center text-white text-2xl font-bold">
// 				Create your account
// 			</h2>

// 			<label class="block">
// 				<input	name="username"
// 						type="text"
// 						placeholder="Username"
// 						autocomplete="username"
// 						required
// 						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
// 			</label>

// 			<label class="block">
// 				<input	name="email"
// 						type="email"
// 						placeholder="E-mail"
// 						autocomplete="email"
// 						required
// 						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
// 			</label>

// 			<label class="block">
// 				<input	name="emailConfirm"
// 						type="email"
// 						placeholder="Confirm e-mail"
// 						autocomplete="email"
// 						required
// 						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
// 			</label>

// 			<label class="block">
// 				<input	name="password"
// 						type="password"
// 						placeholder="Password"
// 						autocomplete="new-password"
// 						required
// 						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
// 			</label>

// 			<button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold cursor-pointer tracking-wide
// 				hover:bg-[#d41d59]
// 				active:bg-[#b31648]
// 			">
// 				Sign Up
// 			</button>

// 			<p id="msg"></p>

// 			<p class="text-center text-sm">
// 				<a href="/login" data-route
// 					class="text-[#ca91a3] underline hover:text-[#f22667]">
// 					Already have an account? Log in
// 				</a>
// 			</p>
// 		</form>
// 	</div>
// `

// const RegisterPage: PageModule = {
// 	render(root) {
// 		root.innerHTML = template
// 	},

// 	async afterRender(root) {
// 		const form = root.querySelector<HTMLFormElement>('#signup')!
// 		const msg  = root.querySelector<HTMLParagraphElement>('#msg')!

// 		form.addEventListener('submit', async e => {
// 			e.preventDefault()
// 			const data = Object.fromEntries(new FormData(form)) as Record<string,string>

// 			/* client-side check */
// 			if (data.email !== data.emailConfirm) {
// 				msg.className = 'form-msg msg-error'
// 				msg.textContent = 'The email addresses do not match!'
// 				return
// 			}

// 			try {
// 				const res = await fetch('/api/register', {
// 					method : 'POST',
// 					headers: { 'Content-Type': 'application/json' },
// 					body : JSON.stringify({
// 						email : data.email.trim(),
// 						password : data.password,
// 						username : data.username.trim()
// 					})
// 				})

// 				if (res.ok) {
// 					msg.className = 'form-msg msg-ok'
// 					msg.textContent = 'Account created successfully!'
// 					form.reset()
// 				} else {
// 					const { error } = await res.json()
// 					msg.className = 'form-msg msg-error'
// 					msg.textContent = error || `Error ${res.status}`
// 				}
// 			} catch {
// 				msg.className = 'form-msg msg-error'
// 				msg.textContent = 'Network error'
// 			}
// 		})
// 	}

// }

// export default RegisterPage

// frontend/src/pages/register.ts
import { router } from '../main';
import type { PageModule } from '../router';
import { clearSession } from '../services/session';

const template = /*html*/`
	<div class="w-full min-h-screen flex items-center justify-center bg-[#221116]">
		<form id="signup"
			class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
			<h2 class="text-center text-white text-2xl font-bold">
				Create your account
			</h2>

			<label class="block">
				<input	name="username"
						type="text"
						placeholder="Username"
						autocomplete="username"
						required
						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<label class="block">
				<input	name="email"
						type="email"
						placeholder="E-mail"
						autocomplete="email"
						required
						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<label class="block">
				<input	name="emailConfirm"
						type="email"
						placeholder="Confirm e-mail"
						autocomplete="email"
						required
						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<label class="block">
				<input	name="password"
						type="password"
						placeholder="Password"
						autocomplete="new-password"
						required
						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold cursor-pointer tracking-wide
				hover:bg-[#d41d59]
				active:bg-[#b31648]
			">
				Sign Up
			</button>

			<p class="text-center text-sm text-white">or</p>

			<a href="/api/auth/google"
				class="w-full block h-10 rounded-xl bg-white text-[#221116] text-center leading-10 font-bold tracking-wide
						hover:bg-gray-200 active:bg-gray-300">
				Sign up with Google
			</a>

			<p id="msg"></p>

			<p class="text-center text-xs text-[#b99da6] px-4">
				By continuing, you agree to our
				<a href="/terms" data-route class="underline hover:text-white">Terms of Service</a> and
				<a href="/privacy" data-route class="underline hover:text-white">Privacy Policy</a>.
			</p>

			<p class="text-center text-sm">
				<a href="/login" data-route
					class="text-[#ca91a3] underline hover:text-[#f22667]">
					Already have an account? Log in
				</a>
			</p>
		</form>
	</div>
`

const RegisterPage: PageModule = {
	render(root) {
		root.innerHTML = template
	},

	async afterRender(root) {
		const form = root.querySelector<HTMLFormElement>('#signup')!
		const msg  = root.querySelector<HTMLParagraphElement>('#msg')!

		form.addEventListener('submit', async e => {
			e.preventDefault()
			const data = Object.fromEntries(new FormData(form)) as Record<string,string>

			/* client-side check */
			if (data.email !== data.emailConfirm) {
				msg.className = 'form-msg msg-error'
				msg.textContent = 'The email addresses do not match!'
				return
			}

			try {
				const res = await fetch('/api/register', {
					method : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body : JSON.stringify({
						email : data.email.trim(),
						password : data.password,
						username : data.username.trim()
					})
				})

				if (res.ok) {
					// Auto-login successful
					clearSession();
					document.dispatchEvent(new Event('auth-change'));
					router.go('/');
				} else {
					const { error } = await res.json()
					msg.className = 'form-msg msg-error'
					msg.textContent = error || `Error ${res.status}`
				}
			} catch {
				msg.className = 'form-msg msg-error'
				msg.textContent = 'Network error'
			}
		})
	}

}

export default RegisterPage
