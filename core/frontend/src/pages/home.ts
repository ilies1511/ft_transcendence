// client/pages/home.ts
import type { PageModule } from '../router';

const HomePage: PageModule = {
  render(root) {
    root.innerHTML = `
      <section class="text-center p-8">
        <h1 class="text-3xl font-bold mb-4">Home</h1>
        <p>Welcome to the SPA demo!</p>
      </section>`;
  }
};

export default HomePage;
