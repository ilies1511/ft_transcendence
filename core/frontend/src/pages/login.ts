// frontend/src/pages/login.ts
import type { PageModule } from '../router'
import { submitLogin } from '../services/auth'
import { router } from '../main'

const template = /*html*/ `
	<div class="w-full min-h-screen flex items-center justify-center bg-[#221116]">
		<form id="login-form"
			  class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
			<h2 class="text-center text-white text-2xl font-bold">Log in to your account</h2>

			<label class="block">
				<input	name="email"
						type="email"
						placeholder="E-mail"
						autocomplete="email"
						required
						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<label class="block">
				<input	name="password"
						type="password"
						placeholder="Password"
						autocomplete="current-password"
						required
						class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
			</label>

			<button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold cursor-pointer tracking-wide
				hover:bg-[#d41d59]
				active:bg-[#b31648]
			">
				Log In
			</button>

			<p class="text-center text-sm text-white">or</p>

			<a href="/api/auth/google"
				class="w-full block h-10 rounded-xl bg-white text-[#221116] text-center leading-10 font-bold tracking-wide
						hover:bg-gray-200 active:bg-gray-300">
				Sign in with Google
			</a>

			<p id="msg"></p>

			<p class="text-center text-sm">
				<a href="/register" data-route
				   class="text-[#ca91a3] underline hover:text-[#f22667]">
					Don't have an account? Sign up
				</a>
			</p>
		</form>
	</div>
`

const LoginPage: PageModule = {
	render(root) {
		root.innerHTML = template;
	},

	async afterRender(root) {
		const form	= root.querySelector<HTMLFormElement>('#login-form')!;
		const msg	= root.querySelector<HTMLParagraphElement>('#msg')!;
		const baseMsg	= 'text-center text-sm font-semibold';

		form.addEventListener('submit', async e => {
			e.preventDefault();

			const { email, password } = Object.fromEntries(new FormData(form)) as {
				email: string;
				password: string;
			};

			try {
				await submitLogin(email, password); // set cookies
				document.dispatchEvent(new Event('auth-change')); // for ws
				router.go('/profile');
			} catch (err: any) {
				msg.className	= `${baseMsg} text-red-500`;
				msg.textContent	= err.message ?? 'Login failed';
			}
		});
	}
};

export default LoginPage;
