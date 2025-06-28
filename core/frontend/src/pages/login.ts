// // client/pages/Login.ts
// import type { PageModule } from '../router';

// const LoginPage: PageModule = {
//   render(root) {
// 	root.innerHTML = `

// <div class="min-h-screen w-full flex items-center justify-center bg-[#221116]">
// 	<div class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
// 		<h2 class="text-center text-white text-2xl font-bold">
// 			Log in to your account
// 		</h2>

// 		<label class="block">
// 			<input
// 			type="text"
// 			placeholder="Username"
// 			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none"
// 			/>
// 		</label>

// 		<!-- Password -->
// 		<label class="block">
// 			<input
// 			type="password"
// 			placeholder="Password"
// 			class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white placeholder:text-[#ca91a3] focus:outline-none"
// 			/>
// 		</label>

// 		<!-- Submit button -->
// 		<button
// 			type="submit"
// 			class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide">
// 			Log In
// 		</button>

// 		<p class="text-center text-sm">
// 		<a href="/register"
// 			data-route
// 			class="text-[#ca91a3] underline hover:text-[#f22667]">
// 			Don't have an account? Sign up
// 		</a>
// 		</p>
// 	</div>
// </div>






// 	  `;
//   }
// };

// export default LoginPage;



import type { PageModule } from '../router'
import { submitLogin }     from '../services/auth'   // helper below
import { router } from '../main'  // whatever exports your Router

const LoginPage: PageModule = {
  render (root) {
    root.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-[#221116]">
        <form id="login-form"
              class="w-full max-w-[400px] p-8 space-y-6 shadow-md rounded-[25px] bg-[#2b171e]">
          <h2 class="text-center text-white text-2xl font-bold">Log in to your account</h2>

          <label class="block">
            <input name="email"
                   type="email"
				   value="1@1.1"
                   placeholder="E-mail"
                   autocomplete="email"
                   class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
                          placeholder:text-[#ca91a3] focus:outline-none" />
          </label>

          <label class="block">
            <input name="password"
                   type="password"
				   value="1"
                   placeholder="Password"
                   autocomplete="current-password"
                   class="w-full h-12 rounded-xl bg-[#48232f] p-4 text-white
                          placeholder:text-[#ca91a3] focus:outline-none" />
          </label>

          <button class="w-full h-10 rounded-xl bg-[#f22667] text-white font-bold tracking-wide">
            Log In
          </button>

          <p id="msg" class="text-center text-sm text-[#ca91a3]"> </p>

          <p class="text-center text-sm">
            <a href="/register" data-route class="text-[#ca91a3] underline hover:text-[#f22667]">
              Don't have an account? Sign up
            </a>
          </p>
        </form>
      </div>`
  },

  async afterRender (root: HTMLElement) {
    const form = root.querySelector<HTMLFormElement>('#login-form')!
    const msg  = root.querySelector<HTMLParagraphElement>('#msg')!

	form.addEventListener('submit', async (e) => {
		e.preventDefault()

		const { email, password } = Object.fromEntries(new FormData(form)) as any

		try {
		  await submitLogin(email, password)  // server sets cookie
		  await router.go('/profile')         // wait until new page rendered
		  document.dispatchEvent(new Event('auth-change')) // update header
		} catch (err: any) {
		  msg.textContent = err.message ?? 'Login failed'
		}
	  })
  }
}

export default LoginPage
