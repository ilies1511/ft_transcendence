// client/pages/Profile.ts
import type { PageModule } from '../router';

const template = /*html*/ `
<div class="w-full max-w-6xl mx-auto p-6 space-y-6">

  <!-- avatar + name -->
  <header class="flex flex-col items-center gap-4">
    <img
      src="https://i.pravatar.cc/128?img=45"
      alt="Sophia Carter"
      class="h-32 w-32 rounded-full object-cover">

	<div class="text-center">
	   <!-- name + online-status -->
	   <div class="flex items-center justify-center gap-2">
	     <h1 class="text-2xl font-bold text-white">Sophia Carter</h1>
	     <!-- green = online · red = offline -->
	     <span id="profileStatus" class="h-3 w-3 rounded-full bg-[#0bda8e]"></span>
	   </div>

	   <p class="text-[#b99da6]">@sophia_carter</p>
	 </div>
  </header>

  <!-- stats -->
  <section class="flex flex-wrap gap-3 px-4">
    <div class="flex flex-1 min-w-[110px] flex-col items-center gap-2 rounded-lg border border-[#543b43] p-3">
      <p class="text-2xl font-bold text-white">120</p>
      <p class="text-sm text-[#b99da6]">Matches</p>
    </div>

    <div class="flex flex-1 min-w-[110px] flex-col items-center gap-2 rounded-lg border border-[#543b43] p-3">
      <p class="text-2xl font-bold text-white">80</p>
      <p class="text-sm text-[#b99da6]">Wins</p>
    </div>

    <div class="flex flex-1 min-w-[110px] flex-col items-center gap-2 rounded-lg border border-[#543b43] p-3">
      <p class="text-2xl font-bold text-white">40</p>
      <p class="text-sm text-[#b99da6]">Losses</p>
    </div>
  </section>

  <!-- match history -->
  <section class="space-y-4">
    <h2 class="px-4 text-xl font-bold text-white">Match History</h2>

    <div class="mx-4 overflow-x-auto rounded-xl border border-[#543b43] bg-[#181113]">
      <table class="min-w-[640px] w-full text-left">
        <thead class="bg-[#271c1f] text-white">
          <tr>
            <th class="px-4 py-3">Date</th>
            <th class="px-4 py-3">Opponent</th>
            <th class="px-4 py-3">Result</th>
            <th class="px-4 py-3">Score</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-[#543b43]">
          <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-15</td>
            <td class="px-4 py-3 text-white">Ethan Harper</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
            <td class="px-4 py-3 text-[#b99da6]">21-18</td>
          </tr>

          <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-12</td>
            <td class="px-4 py-3 text-white">Olivia Zhang</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
            <td class="px-4 py-3 text-[#b99da6]">19-21</td>
          </tr>

          <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-10</td>
            <td class="px-4 py-3 text-white">Nathan Taylor</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
            <td class="px-4 py-3 text-[#b99da6]">21-15</td>
          </tr>

          <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-08</td>
            <td class="px-4 py-3 text-white">Chloe Evans</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
            <td class="px-4 py-3 text-[#b99da6]">21-17</td>
          </tr>

          <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
            <td class="px-4 py-3 text-white">Ryan Clark</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
            <td class="px-4 py-3 text-[#b99da6]">16-21</td>
          </tr>
		            <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
            <td class="px-4 py-3 text-white">Ryan Clark</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
            <td class="px-4 py-3 text-[#b99da6]">16-21</td>
          </tr>
		            <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
            <td class="px-4 py-3 text-white">Ryan Clark</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
            <td class="px-4 py-3 text-[#b99da6]">16-21</td>
          </tr>
		            <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
            <td class="px-4 py-3 text-white">Ryan Clark</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#D22B2B] px-4 py-1 text-white">Loss</span></td>
            <td class="px-4 py-3 text-[#b99da6]">16-21</td>
          </tr>
		            <tr>
            <td class="px-4 py-3 text-[#b99da6]">2024-01-05</td>
            <td class="px-4 py-3 text-white">Ryan Clark</td>
            <td class="px-4 py-3"><span class="inline-block rounded-full bg-[#0bda8e] px-4 py-1 text-white">Win</span></td>
            <td class="px-4 py-3 text-[#b99da6]">16-21</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</div>
`;

const ProfilePage: PageModule = {
  render(root: HTMLElement) {
    root.innerHTML = template;
  }
};

export default ProfilePage;
