// client/pages/Login.ts
import type { PageModule } from '../router';

const LoginPage: PageModule = {
  render(root) {
	root.innerHTML = `




<div class="min-h-screen w-full flex items-center justify-center bg-[#221116]">
	<div class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
		<h2 class="text-center text-white text-2xl font-bold">
			Log in to your account
		</h2>

		<label class="block">
			<input
			type="text"
			placeholder="Username"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none"
			/>
		</label>

		<!-- Password -->
		<label class="block">
			<input
			type="password"
			placeholder="Password"
			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none"
			/>
		</label>

		<!-- Submit button -->
		<button
			type="submit"
			class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide">
			Log In
		</button>

		<p class="text-center text-sm">
		<a href="/register"
			data-route
			class="text-[#ca91a3] underline hover:text-[#f22667]">
			Don't have an account? Sign up
		</a>
		</p>
	</div>
</div>






	  `;
  }
};

export default LoginPage;
