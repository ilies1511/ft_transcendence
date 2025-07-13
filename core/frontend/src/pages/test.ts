// frontend/src/pages/about.ts
import type { PageModule } from '../router';

const test: PageModule = {
	render(root) {
		root.innerHTML = `
		<section class="p-8">
			<h1 class="text-3xl font-bold mb-4 text-[#846543] hover:text-[#980645]">TEST</h1>
			<p>This site is built with TEST TEST TEST</p>
		</section>`;
	}
};

export default test;
