// client/pages/Register.ts
import type { PageModule } from '../router';

const RegisterPage: PageModule = {
  render(root) {
	root.innerHTML = `




<div class="min-h-screen w-full flex items-center justify-center bg-[#221116]">
	<div class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
		<h2 class="text-center text-white text-2xl font-bold">
			Create your account
		</h2>

		<!-- Username -->
		<label class="block">
			<input
			type="text"
			placeholder="Username"
			autocomplete="username"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
					placeholder:text-[#ca91a3] focus:outline-none" />
		</label>

		<!-- E-mail -->
		<label class="block">
			<input
			type="email"
			placeholder="E-mail"
			autocomplete="email"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
					placeholder:text-[#ca91a3] focus:outline-none" />
		</label>

		<!-- Confirm e-mail -->
		<label class="block">
			<input
			type="email"
			placeholder="Confirm e-mail"
			autocomplete="email"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
					placeholder:text-[#ca91a3] focus:outline-none" />
		</label>

		<!-- Password -->
		<label class="block">
			<input
			type="password"
			placeholder="Password"
			autocomplete="new-password"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
					placeholder:text-[#ca91a3] focus:outline-none" />
		</label>

		<!-- Sign-up button -->
		<button
			type="submit"
			class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide">
			Sign Up
		</button>

		<p class="text-center text-sm">
		<a href="/login"
			data-route
			class="text-[#ca91a3] underline hover:text-[#f22667]">
			Already have an account? Log in
		</a>
		</p>




		</div>
	</div>

</div>






	  `;
  }
};

export default RegisterPage;
