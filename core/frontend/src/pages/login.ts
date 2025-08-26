// frontend/src/pages/login.ts
import { router } from '../main';
import type { PageModule } from '../router';
import { token as CSRFToken, clearSession } from '../services/session';

const template = /*html*/ `
	<div class="w-full min-h-screen flex items-center justify-center bg-[#221116]">
		<form id="login-form"
			  class="w-full max-w-[400px] p-8 space-y-4 shadow-md rounded-[25px] bg-[#2b171e]">
			<h2 class="text-center text-white text-2xl font-bold">Log in to your account</h2>

			<!-- Standard Login Fields -->
			<div id="credentials-section">
				<label class="block">
					<input	name="email"
							type="email"
							placeholder="E-mail"
							autocomplete="email"
							required
							class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>

				<div class="h-4"></div>

				<label class="block">
					<input	name="password"
							type="password"
							placeholder="Password"
							autocomplete="current-password"
							required
							class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none" />
				</label>
			</div>

			<!-- 2FA Verification Section (hidden by default) -->
			<div id="twofa-section" class="hidden">
				<p class="text-center text-white mb-4">Enter the 6-digit code from your authenticator app.</p>
				<label class="block">
					<input	id="twofa-token"
							name="token"
							type="text"
							placeholder="6-digit code"
							autocomplete="one-time-code"
							inputmode="numeric"
							maxlength="6"
							class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white text-center tracking-[0.5em] placeholder:tracking-normal placeholder:text-[#ca91a3] focus:outline-none" />
				</label>
			</div>


			<button id="login-button" class="w-full h-10 rounded-xl bg-[#f22667]
				text-white font-bold
				cursor-pointer
				tracking-wide
				mb-2
				hover:bg-[#d41d59]
				active:bg-[#b31648]
			">
				Log In
			</button>

			<p id="or-separator" class="text-center text-sm text-white mb-2">or</p>

			<a id="google-login-button" href="/api/auth/google"
				class="w-full block h-10 rounded-xl bg-white text-[#221116] text-center leading-10 font-bold tracking-wide
						hover:bg-gray-200 active:bg-gray-300">
				Sign in with Google
			</a>

			<p id="msg"></p>

			<p class="text-center text-xs text-[#b99da6] px-4">
				By continuing, you agree to our
				<a href="/terms" data-route class="underline hover:text-white">Terms of Service</a> and
				<a href="/privacy" data-route class="underline hover:text-white">Privacy Policy</a>.
			</p>

			<p id="signup-link-container" class="text-center text-sm">
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
		const form = root.querySelector<HTMLFormElement>('#login-form')!;
		const msg = root.querySelector<HTMLParagraphElement>('#msg')!;
		const credentialsSection = root.querySelector<HTMLDivElement>('#credentials-section')!;
		const twofaSection = root.querySelector<HTMLDivElement>('#twofa-section')!;
		const twofaTokenInput = root.querySelector<HTMLInputElement>('#twofa-token')!;
		const loginButton = root.querySelector<HTMLButtonElement>('#login-button')!;
		const emailInput = root.querySelector<HTMLInputElement>('input[name="email"]')!;
		const passwordInput = root.querySelector<HTMLInputElement>('input[name="password"]')!;
		const orSeparator = root.querySelector<HTMLParagraphElement>('#or-separator')!;
		const googleLoginButton = root.querySelector<HTMLAnchorElement>('#google-login-button')!;
		const signupLinkContainer = root.querySelector<HTMLParagraphElement>('#signup-link-container')!;
		const baseMsg = 'text-center text-sm font-semibold';

		let is2faStep = false;
		let isGoogle2fa = false;

		const transitionTo2FA = () => {
			credentialsSection.classList.add('hidden');
			twofaSection.classList.remove('hidden');
			orSeparator.classList.add('hidden');
			googleLoginButton.classList.add('hidden');
			signupLinkContainer.classList.add('hidden');
			loginButton.textContent = 'Verify Code';
			twofaTokenInput.focus();
		};

		// Check for 2FA redirect from Google OAuth
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('2fa_required') === 'true' && urlParams.has('email')) {
			const email = urlParams.get('email')!;
			is2faStep = true;
			isGoogle2fa = true;
			emailInput.value = email;
			emailInput.readOnly = true; // Prevent user from changing email
			passwordInput.required = false; // Google users don't need password
			passwordInput.parentElement?.classList.add('hidden'); // Google users don't need password
			transitionTo2FA();

			// Clean up URL
			history.replaceState(null, '', '/login');
		}


		form.addEventListener('submit', async e => {
			e.preventDefault();
			msg.textContent = '';

			const formData = new FormData(form);
			const { email, password, token } = Object.fromEntries(formData) as {
				email: string;
				password?: string;
				token?: string;
			};

			try {
				if (is2faStep) {
					// Step 2: Verify 2FA token
					const body: { email: string, token: string, password?: string } = {
						email,
						token: token!,
					};

					// Only include password for standard login, not for Google 2FA
					if (!isGoogle2fa) {
						body.password = password;
					}

					const headers = new Headers({ 'Content-Type': 'application/json' });
					if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
					const res = await fetch('/api/login/2fa', {
						method: 'POST',
						headers,
						body: JSON.stringify(body),
						credentials: 'include'
					});



					if (!res.ok) {
						const { error } = await res.json().catch(() => ({}));
						throw new Error(error ?? 'Invalid 2FA code');
					}
				} else {
					// Submit credentials
					const headers = new Headers({ 'Content-Type': 'application/json' });
					if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
					const res = await fetch('/api/login', {
						method: 'POST',
						headers,
						body: JSON.stringify({ email, password }),
						credentials: 'include'
					});

					const data = await res.json().catch(() => ({}));

					if (!res.ok) {
						throw new Error(data.error ?? 'Login failed');
					}

					if (data.twofa_required) {
						// Transition to 2FA step
						is2faStep = true;
						transitionTo2FA();
						return; // Wait for user to enter token
					}
				}

				// Login successful (either directly or after 2FA)
				clearSession();
				globalThis.logged_in = true;
				document.dispatchEvent(new Event('auth-change'));
				router.go('/');

			} catch (err: any) {
				msg.className = `${baseMsg} text-red-500`;
				msg.textContent = err.message ?? 'An error occurred';
			}
		});
	}
};

export default LoginPage;
