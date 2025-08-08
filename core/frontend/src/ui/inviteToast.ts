// src/ui/inviteToast.ts
export function inviteToast(fromName: string) {
	const box = document.createElement('div');
	box.className =
		`fixed top-6 right-6 z-[9999] w-80
		 rounded-xl border border-[#543b43] bg-[#2b171e]
		 shadow-lg text-white text-sm px-6 py-5 space-y-4`;

	box.innerHTML = /*html*/`
		<!-- header -->
		<div class="flex items-start gap-4">
			<div class="flex-1">
				<p class="text-base font-semibold tracking-wide">Game invite</p>
				<p class="text-[#b99da6]">from <span class="italic">${fromName}</span></p>
			</div>
			<button class="gi-close text-[#b99da6] hover:text-white text-lg leading-none">×</button>
		</div>

		<!-- stub buttons -->
		<div class="flex justify-end gap-3">
			<button data-act="decline"
				class="gi-btn h-8 w-8 rounded-md bg-[#D22B2B] hover:bg-[#b91c1c] text-lg">✗</button>
			<button data-act="accept"
				class="gi-btn h-8 w-8 rounded-md bg-[#0bda8e] hover:bg-[#0ac582] text-black text-lg">✓</button>
		</div>
	`;

	document.body.append(box);

	/* close via × */
	box.querySelector<HTMLButtonElement>('.gi-close')!
		.addEventListener('click', () => box.remove());

	/* demo click handlers */
	box.querySelectorAll<HTMLButtonElement>('.gi-btn')
		.forEach(btn =>
			btn.addEventListener('click', () => {
				const act = btn.dataset.act; // "accept" | "decline"
				console.log(`[invite] ${act} clicked`);
				box.remove();
			})
		);

	/* auto-dismiss after 10 s if untouched */
	// setTimeout(() => box.remove(), 10000);
}
