// client/pages/about.ts
import type { PageModule } from '../router';

const AboutPage: PageModule = {
  render(root) {
    root.innerHTML = `
      <section class="p-8">
        <h1 class="text-3xl font-bold mb-4 text-[#846543] hover:text-[#980645]">About f time</h1>
        <p>This site is built with pure TypeScript, Vite and Tailwind.</p>
      </section>`;
  }
};

export default AboutPage;
