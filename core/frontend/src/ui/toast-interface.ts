// src/ui/toast-interface.ts
import { icons } from './icons';

interface ToastOptions {
	title: string;
	from: string;
	onAccept?: ()=>Promise<boolean> | boolean;
	onReject?: ()=>Promise<boolean> | boolean;
}

export function showToast(toast: ToastOptions):HTMLDivElement {
	const box = document.createElement('div');
	box.className =
		`fixed top-6 right-6 z-[9999] w-60 rounded-xl border border-[#543b43]
		bg-[#2b171e] shadow-lg text-white text-sm px-6 py-5 space-y-4`;

	box.innerHTML = /*html*/`
		<div class="flex items-start gap-4">
			<div class="flex-1">
				<h3 class="text-base font-semibold">${toast.title}</h3>
				<p class="text-[#b99da6]">from <span class="italic">${toast.from}</span></p>
			</div>
			<button class="t-close text-[#b99da6] hover:text-white text-lg
			leading-none cursor-pointer">
				${icons.closeX_micro}
			</button>
		</div>

		<div class="flex justify-end gap-3">
			<button class="t-accept flex items-center justify-center h-8 w-8
				rounded-md bg-green-800 hover:bg-green-700 text-lg
				cursor-pointer">
					${icons.accept}
				</button>
			<button class="t-reject flex items-center justify-center h-8 w-8
				rounded-md bg-red-800 hover:bg-red-700 text-lg
				cursor-pointer">
					${icons.decline}
				</button>
		</div>`;

	document.body.append(box);

	const close = () => box.remove();
	box.querySelector<HTMLButtonElement>('.t-close')!
		.addEventListener('click', close);

	const fireFriendsChanged = () => document.dispatchEvent(new Event('friends-changed'));
	box.querySelector<HTMLButtonElement>('.t-accept')!
		.addEventListener('click', async () => {
			const ok = await toast.onAccept?.();
			if (ok) fireFriendsChanged();
			close();
		});

	box.querySelector<HTMLButtonElement>('.t-reject')!
		.addEventListener('click', async () => {
			const ok = await toast.onReject?.();
			if (ok) fireFriendsChanged();
			close();
		});

	setTimeout(close, 10000000);

	return box;
}
