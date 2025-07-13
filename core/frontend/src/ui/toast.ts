// frontend/src/ui/toast.ts
export async function friendRequestToast(requestId: number, from: string): Promise<void> {
	const box = document.createElement('div');
	box.className =
		`fixed top-6 right-6 z-[9999] w-80
		 rounded-xl border border-[#543b43] bg-[#2b171e]
		 shadow-lg text-white text-sm px-6 py-5 space-y-4`;

	box.innerHTML = /*html*/`
		<div class="flex items-start gap-4">
			<div class="flex-1">
				<p class="text-base font-semibold tracking-wide">Friend request</p>
				<p class="text-[#b99da6]">from <span class="italic">${from}</span></p>
			</div>
			<button class="ft-close text-[#b99da6] hover:text-white text-lg leading-none">×</button>
		</div>

		<div class="flex justify-end gap-3">
			<button data-act="reject"
				class="ft-btn h-8 w-8 rounded-md bg-[#D22B2B] hover:bg-[#b91c1c] text-lg focus:outline-none">✗</button>

			<button data-act="accept"
				class="ft-btn h-8 w-8 rounded-md bg-[#0bda8e] hover:bg-[#0ac582] text-black text-lg focus:outline-none">✓</button>
		</div>
	`;

	document.body.append(box);

	/* ───── interactions ───── */
	box.querySelector<HTMLButtonElement>('.ft-close')!
		.addEventListener('click', () => box.remove());

	box.querySelectorAll<HTMLButtonElement>('.ft-btn')
		.forEach(btn =>
			btn.addEventListener('click', async () => {
				const act = btn.dataset.act as 'accept' | 'reject';
				const res = await fetch(`/api/requests/${requestId}/${act}`, { method: 'POST' });

				box.innerHTML = res.ok
					? `<p class="text-center py-2">${ act === 'accept'
							? 'Request accepted 👍'
							: 'Request rejected 👌' }</p>`
					: '<p class="text-center text-red-400 py-2">Server error</p>';

				setTimeout(() => box.remove(), 1500);
			})
		);
}
